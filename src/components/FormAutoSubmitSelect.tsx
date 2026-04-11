"use client";

type FormAutoSubmitSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function FormAutoSubmitSelect(props: FormAutoSubmitSelectProps) {
  return (
    <select
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
