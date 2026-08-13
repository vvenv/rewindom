import {
  InputGroup,
  InputGroupInput,
} from "@rewindom/ui/input-group";

function normalizeTimeInputValue(value: string): string {
  if (value.length === 5) {
    return `${value}:00`;
  }
  if (value.length === 8) {
    return value;
  }
  return "00:00:00";
}

export function TimeInput({
  value,
  onChange,
  mobile = false,
}: {
  value: string;
  onChange: (value: string) => void;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <InputGroup className="h-10 min-w-0 flex-1">
        <InputGroupInput
          type="time"
          step={1}
          value={value.slice(0, 8)}
          onChange={(e) => onChange(normalizeTimeInputValue(e.target.value))}
        />
      </InputGroup>
    );
  }

  const [hours, minutes, seconds] = (value || "00:00:00")
    .split(":")
    .map(Number);

  const updateValue = (h: number, m: number, s: number) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    onChange(`${hh}:${mm}:${ss}`);
  };

  return (
    <InputGroup>
      <InputGroupInput
        type="number"
        min="0"
        max="23"
        value={String(hours).padStart(2, "0")}
        onChange={(e) => {
          const h = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(h, minutes, seconds);
        }}
        className="px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground">:</span>
      <InputGroupInput
        type="number"
        min="0"
        max="59"
        value={String(minutes).padStart(2, "0")}
        onChange={(e) => {
          const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(hours, m, seconds);
        }}
        className="px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground">:</span>
      <InputGroupInput
        type="number"
        min="0"
        max="59"
        value={String(seconds).padStart(2, "0")}
        onChange={(e) => {
          const s = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(hours, minutes, s);
        }}
        className="w-12 px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </InputGroup>
  );
}
