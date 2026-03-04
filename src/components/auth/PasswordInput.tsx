import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  className?: string;
};

export const PasswordInput: React.FC<PasswordInputProps> = ({
  className = "input-login",
  ...inputProps
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        type={visible ? "text" : "password"}
        className={className}
        {...inputProps}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        title={visible ? "Hide password" : "Show password"}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <FaEyeSlash aria-hidden /> : <FaEye aria-hidden />}
      </button>
    </div>
  );
};

export default PasswordInput;
