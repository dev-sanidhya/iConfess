import "server-only";

import { Prisma } from "@prisma/client";
import { AppConfigKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AppSettings = {
  instagramId: string;
  snapchatId: string;
  contactEmail: string;
  feedbackEmail: string;
};

const defaultAppSettings: AppSettings = {
  instagramId: "iconfess.in",
  snapchatId: "",
  contactEmail: "ciarocid01@gmail.com",
  feedbackEmail: "ciarocid01@gmail.com",
};

const appSettingKeyMap: Record<AppConfigKey, keyof AppSettings> = {
  ICONFESS_INSTAGRAM_ID: "instagramId",
  ICONFESS_SNAPCHAT_ID: "snapchatId",
  CONTACT_US_EMAIL: "contactEmail",
  FEEDBACK_EMAIL: "feedbackEmail",
};

function isMissingAppConfigTable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function isUnavailableDatasource(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P6001";
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = { ...defaultAppSettings };

  try {
    const configs = await prisma.appConfig.findMany();
    for (const config of configs) {
      const mappedKey = appSettingKeyMap[config.key];
      if (!mappedKey) {
        continue;
      }

      settings[mappedKey] = config.value;
    }
  } catch (error) {
    if (!isMissingAppConfigTable(error) && !isUnavailableDatasource(error)) {
      throw error;
    }
  }

  return settings;
}

export async function updateAppSettings(partial: Partial<AppSettings>) {
  try {
    const writes = Object.entries(partial)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => {
        const configKey = (Object.entries(appSettingKeyMap).find(([, mapped]) => mapped === key)?.[0] ?? null) as AppConfigKey | null;
        if (!configKey) {
          return null;
        }

        return prisma.appConfig.upsert({
          where: { key: configKey },
          update: { value: value ?? "" },
          create: {
            key: configKey,
            value: value ?? "",
          },
        });
      })
      .filter((write): write is NonNullable<typeof write> => Boolean(write));

    if (writes.length > 0) {
      await prisma.$transaction(writes);
    }
  } catch (error) {
    if (isMissingAppConfigTable(error) || isUnavailableDatasource(error)) {
      throw new Error("App settings table is missing. Run the latest Prisma schema sync first.");
    }

    throw error;
  }

  return getAppSettings();
}
