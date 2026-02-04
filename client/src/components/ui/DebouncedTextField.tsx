import { useState, useEffect, useRef, memo } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

interface DebouncedTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  transformValue?: (value: string) => string;
}

/**
 * A TextField that debounces changes to prevent parent re-renders during typing.
 * This prevents cursor position issues that occur when React re-renders controlled inputs.
 */
export const DebouncedTextField = memo(function DebouncedTextField({
  value: externalValue,
  onChange,
  debounceMs = 300,
  transformValue,
  ...props
}: DebouncedTextFieldProps) {
  // Internal state that updates immediately on keystroke
  const [internalValue, setInternalValue] = useState(externalValue);
  const isInternalChange = useRef(false);

  // Sync external value to internal only when it changes externally (e.g., clear filters)
  useEffect(() => {
    if (!isInternalChange.current) {
      setInternalValue(externalValue);
    }
    isInternalChange.current = false;
  }, [externalValue]);

  // Debounce the onChange callback
  useEffect(() => {
    if (internalValue === externalValue) return;

    const timer = setTimeout(() => {
      isInternalChange.current = true;
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, externalValue, onChange, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = transformValue ? transformValue(e.target.value) : e.target.value;
    setInternalValue(newValue);
  };

  return (
    <TextField
      {...props}
      value={internalValue}
      onChange={handleChange}
    />
  );
});
