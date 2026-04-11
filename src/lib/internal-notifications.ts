import { ConfessionStatus, PendingProfileSearchKind } from "@prisma/client";
import type { NotificationAudienceCategory as PrismaNotificationAudienceCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationExportColumn = "name" | "phone" | "count" | "lastChangedAt";
export type NotificationAudienceCategory = PrismaNotificationAudienceCategory;

export const NOTIFICATION_AUDIENCE_CATEGORY = {
  UNREGISTERED_PHONE_SEARCH: "UNREGISTERED_PHONE_SEARCH",
  LOCKED_CONFESSION_RECIPIENT: "LOCKED_CONFESSION_RECIPIENT",
  PENDING_MUTUAL_REVEAL: "PENDING_MUTUAL_REVEAL",
} as const satisfies Record<string, NotificationAudienceCategory>;

export type NotificationAudienceRow = {
  key: string;
  name: string;
  phone: string;
  count: number;
  pendingItems: number;
  lastChangedAt: string | null;
};

function applyCountFilter(rows: NotificationAudienceRow[], countFilter?: number | null) {
  if (!Number.isInteger(countFilter)) {
    return rows;
  }

  return rows.filter((row) => row.count === countFilter);
}

export const NOTIFICATION_AUDIENCE_OPTIONS = [
  {
    value: NOTIFICATION_AUDIENCE_CATEGORY.UNREGISTERED_PHONE_SEARCH,
    label: "Unregistered Phone Searches",
    description: "Phone numbers that were searched but still have no registered account.",
  },
  {
    value: NOTIFICATION_AUDIENCE_CATEGORY.LOCKED_CONFESSION_RECIPIENT,
    label: "Received But Not Unlocked",
    description: "Users who still have at least one locked received confession.",
  },
  {
    value: NOTIFICATION_AUDIENCE_CATEGORY.PENDING_MUTUAL_REVEAL,
    label: "Mutual Reveal Pending",
    description: "Users who received a mutual confession but have not given reveal consent yet.",
  },
] as const;

const NOTIFICATION_AUDIENCE_VALUES = NOTIFICATION_AUDIENCE_OPTIONS.map((option) => option.value);

const categoryLabels = new Map(
  NOTIFICATION_AUDIENCE_OPTIONS.map((option) => [option.value, option.label] as const)
);

function isMissingNotificationCounterTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "P2021" || message.includes("NotificationAudienceCounter");
}

function isMissingNotificationTrackingSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("NotificationAudienceCounter") ||
    message.includes("NotificationAudienceCounterChange") ||
    message.includes("NotificationAudienceCategory")
  );
}

function toCounterKey(category: NotificationAudienceCategory, subjectUserId: string | null, subjectPhone: string | null) {
  return `${category}:${subjectUserId ?? ""}:${subjectPhone ?? ""}`;
}

export function isNotificationAudienceCategory(value: unknown): value is NotificationAudienceCategory {
  return typeof value === "string" && NOTIFICATION_AUDIENCE_VALUES.includes(value as NotificationAudienceCategory);
}

export function getNotificationAudienceLabel(category: NotificationAudienceCategory) {
  return categoryLabels.get(category) ?? category;
}

export function formatNotificationTimestamp(value: string | Date | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("hour")}:${getPart("minute")} ${getPart("day")}-${getPart("month")}-${getPart("year")}`;
}

async function getCounterMap(category: NotificationAudienceCategory) {
  try {
    const counters = await prisma.notificationAudienceCounter.findMany({
      where: { category },
      select: {
        category: true,
        subjectUserId: true,
        subjectPhone: true,
        count: true,
        lastChangedAt: true,
      },
    });

    return new Map(
      counters.map((counter) => [
        toCounterKey(counter.category, counter.subjectUserId, counter.subjectPhone),
        counter,
      ])
    );
  } catch (error) {
    if (isMissingNotificationCounterTable(error)) {
      return new Map();
    }

    throw error;
  }
}

export async function getNotificationAudienceRows(
  category: NotificationAudienceCategory,
  countFilter?: number | null
): Promise<NotificationAudienceRow[]> {
  const counters = await getCounterMap(category);

  if (category === NOTIFICATION_AUDIENCE_CATEGORY.UNREGISTERED_PHONE_SEARCH) {
    const searches = await prisma.pendingProfileSearchCount.findMany({
      where: { kind: PendingProfileSearchKind.PHONE },
      orderBy: [{ updatedAt: "desc" }, { value: "asc" }],
      select: {
        value: true,
        count: true,
      },
    });

    return applyCountFilter(searches.map((entry) => {
      const counter = counters.get(toCounterKey(category, null, entry.value));
      return {
        key: entry.value,
        name: "Unregistered user",
        phone: entry.value,
        count: counter?.count ?? 0,
        pendingItems: entry.count,
        lastChangedAt: counter?.lastChangedAt?.toISOString() ?? null,
      };
    }), countFilter);
  }

  if (category === NOTIFICATION_AUDIENCE_CATEGORY.LOCKED_CONFESSION_RECIPIENT) {
    const confessions = await prisma.confession.findMany({
      where: {
        targetId: { not: null },
        status: { not: ConfessionStatus.EXPIRED },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        targetId: true,
        unlockedBy: {
          select: {
            userId: true,
          },
        },
        target: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    const rows = new Map<string, NotificationAudienceRow>();
    for (const confession of confessions) {
      if (!confession.targetId || !confession.target) continue;
      const unlocked = confession.unlockedBy.some((entry) => entry.userId === confession.targetId);
      if (unlocked) continue;

      const existing = rows.get(confession.targetId);
      if (existing) {
        existing.pendingItems += 1;
        continue;
      }

      const counter = counters.get(toCounterKey(category, confession.targetId, null));
      rows.set(confession.targetId, {
        key: confession.targetId,
        name: confession.target.name,
        phone: confession.target.phone,
        count: counter?.count ?? 0,
        pendingItems: 1,
        lastChangedAt: counter?.lastChangedAt?.toISOString() ?? null,
      });
    }

    return applyCountFilter(
      [...rows.values()].sort((left, right) => right.pendingItems - left.pendingItems || left.name.localeCompare(right.name)),
      countFilter
    );
  }

  const confessions = await prisma.confession.findMany({
    where: {
      targetId: { not: null },
      mutualDetected: true,
      revealedAt: null,
      targetRevealConsent: false,
      status: { not: ConfessionStatus.EXPIRED },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      targetId: true,
      target: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });

  const rows = new Map<string, NotificationAudienceRow>();
  for (const confession of confessions) {
    if (!confession.targetId || !confession.target) continue;

    const existing = rows.get(confession.targetId);
    if (existing) {
      existing.pendingItems += 1;
      continue;
    }

    const counter = counters.get(toCounterKey(category, confession.targetId, null));
    rows.set(confession.targetId, {
      key: confession.targetId,
      name: confession.target.name,
      phone: confession.target.phone,
      count: counter?.count ?? 0,
      pendingItems: 1,
      lastChangedAt: counter?.lastChangedAt?.toISOString() ?? null,
    });
  }

  return applyCountFilter(
    [...rows.values()].sort((left, right) => right.pendingItems - left.pendingItems || left.name.localeCompare(right.name)),
    countFilter
  );
}

export async function applyNotificationCountDelta(
  category: NotificationAudienceCategory,
  delta: number,
  countFilter?: number | null
) {
  const rows = await getNotificationAudienceRows(category, countFilter);
  if (rows.length === 0 || delta === 0) {
    return rows;
  }

  const now = new Date();

  try {
    for (const row of rows) {
      const subjectUserId = category === NOTIFICATION_AUDIENCE_CATEGORY.UNREGISTERED_PHONE_SEARCH ? null : row.key;
      const subjectPhone = category === NOTIFICATION_AUDIENCE_CATEGORY.UNREGISTERED_PHONE_SEARCH ? row.phone : null;

      const existing = await prisma.notificationAudienceCounter.findFirst({
        where: {
          category,
          ...(subjectUserId ? { subjectUserId } : { subjectPhone }),
        },
        select: {
          id: true,
          count: true,
        },
      });

      const previousCount = existing?.count ?? 0;
      const nextCount = Math.max(0, previousCount + delta);
      if (nextCount === previousCount) {
        continue;
      }

      let counterId = existing?.id;
      if (counterId) {
        await prisma.notificationAudienceCounter.update({
          where: { id: counterId },
          data: {
            count: nextCount,
            lastChangedAt: now,
          },
        });
      } else {
        const created = await prisma.notificationAudienceCounter.create({
          data: {
            category,
            subjectUserId,
            subjectPhone,
            count: nextCount,
            lastChangedAt: now,
          },
          select: { id: true },
        });
        counterId = created.id;
      }

      await prisma.notificationAudienceCounterChange.create({
        data: {
          counterId,
          previousCount,
          nextCount,
          changedAt: now,
        },
      });
    }
  } catch (error) {
    if (isMissingNotificationTrackingSchema(error)) {
      return rows;
    }

    throw error;
  }

  return getNotificationAudienceRows(category, countFilter);
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function getColumnLabel(column: NotificationExportColumn) {
  if (column === "name") return "Name";
  if (column === "phone") return "Phone Number";
  if (column === "count") return "Count";
  return "Time & Date Changed";
}

function getColumnValue(row: NotificationAudienceRow, column: NotificationExportColumn) {
  if (column === "name") return row.name;
  if (column === "phone") return row.phone;
  if (column === "count") return String(row.count);
  return formatNotificationTimestamp(row.lastChangedAt);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildNotificationCsv(rows: NotificationAudienceRow[], columns: NotificationExportColumn[]) {
  const header = columns.map((column) => escapeCsvValue(getColumnLabel(column))).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(getColumnValue(row, column))).join(","));
  return [header, ...body].join("\r\n");
}

function getExcelColumnName(index: number) {
  let current = index + 1;
  let name = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files: Array<{ name: string; content: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const contentBuffer = file.content;
    const checksum = crc32(contentBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localDirectory.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, endRecord]);
}

export function buildNotificationXlsx(
  category: NotificationAudienceCategory,
  rows: NotificationAudienceRow[],
  columns: NotificationExportColumn[]
) {
  const worksheetRows = [
    columns.map((column) => getColumnLabel(column)),
    ...rows.map((row) => columns.map((column) => getColumnValue(row, column))),
  ];

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${worksheetRows.map((row, rowIndex) => `
      <row r="${rowIndex + 1}">
        ${row.map((value, cellIndex) => `
          <c r="${getExcelColumnName(cellIndex)}${rowIndex + 1}" t="inlineStr">
            <is><t>${escapeXml(value)}</t></is>
          </c>
        `).join("")}
      </row>
    `).join("")}
  </sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(getNotificationAudienceLabel(category).slice(0, 31))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  return createStoredZip([
    { name: "[Content_Types].xml", content: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", content: Buffer.from(rootRelsXml, "utf8") },
    { name: "xl/workbook.xml", content: Buffer.from(workbookXml, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", content: Buffer.from(workbookRelsXml, "utf8") },
    { name: "xl/styles.xml", content: Buffer.from(stylesXml, "utf8") },
    { name: "xl/worksheets/sheet1.xml", content: Buffer.from(worksheetXml, "utf8") },
  ]);
}

export function buildNotificationWordDocument(
  category: NotificationAudienceCategory,
  rows: NotificationAudienceRow[],
  columns: NotificationExportColumn[]
) {
  const title = `${getNotificationAudienceLabel(category)} Notification List`;
  const headerCells = columns
    .map((column) => `<th style="border:1px solid #d4b38c;padding:8px;text-align:left;background:#f3e6d4;">${escapeHtml(getColumnLabel(column))}</th>`)
    .join("");
  const bodyRows = rows
    .map((row) => (
      `<tr>${columns
        .map((column) => `<td style="border:1px solid #e7d2b7;padding:8px;">${escapeHtml(getColumnValue(row, column))}</td>`)
        .join("")}</tr>`
    ))
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:Calibri, Arial, sans-serif;padding:24px;color:#3f2c1d;">
  <h1 style="margin:0 0 8px 0;">${escapeHtml(title)}</h1>
  <p style="margin:0 0 20px 0;">Generated on ${escapeHtml(formatNotificationTimestamp(new Date()))}</p>
  <table style="border-collapse:collapse;width:100%;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function splitPdfLines(text: string, maxLength: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [text];
}

export function buildNotificationPdf(
  category: NotificationAudienceCategory,
  rows: NotificationAudienceRow[],
  columns: NotificationExportColumn[]
) {
  const lines = [
    `${getNotificationAudienceLabel(category)} Notification List`,
    `Generated on ${formatNotificationTimestamp(new Date())}`,
    "",
    columns.map((column) => getColumnLabel(column)).join(" | "),
    "-".repeat(100),
    ...rows.flatMap((row) => splitPdfLines(columns.map((column) => getColumnValue(row, column)).join(" | "), 96)),
  ];

  const pageHeight = 842;
  const top = 800;
  const lineHeight = 16;
  const bottom = 48;
  const pageLines: string[][] = [[]];
  let currentY = top;

  for (const line of lines) {
    if (currentY < bottom) {
      pageLines.push([]);
      currentY = top;
    }

    pageLines[pageLines.length - 1].push(line);
    currentY -= lineHeight;
  }

  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];

  const fontObjectNumber = 1;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  for (const page of pageLines) {
    const streamLines = ["BT", "/F1 10 Tf"];
    let y = top;
    for (const line of page) {
      streamLines.push(`1 0 0 1 40 ${y} Tm (${escapePdfText(line)}) Tj`);
      y -= lineHeight;
    }
    streamLines.push("ET");

    const stream = streamLines.join("\n");
    const contentObjectNumber = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);

    const pageObjectNumber = objects.length + 1;
    pageObjectNumbers.push(pageObjectNumber);
    objects.push(
      `<< /Type /Page /Parent ${pageLines.length * 2 + 2} 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
  }

  const pagesObjectNumber = objects.length + 1;
  objects.push(`<< /Type /Pages /Kids [${pageObjectNumbers.map((page) => `${page} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`);

  const catalogObjectNumber = objects.length + 1;
  objects.push(`<< /Type /Catalog /Pages ${pagesObjectNumber} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
