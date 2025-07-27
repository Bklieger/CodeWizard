import React from "react";

export default function CodeWizardLogo({ height = 20 }: { height?: number }) {
  return (
    <svg
      role="img"
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hat brim */}
      <ellipse
        cx="16"
        cy="26"
        rx="12"
        ry="3"
        fill="#4f46e5"
      />
      
      {/* Hat cone */}
      <path
        d="M16 4 L8 24 L24 24 Z"
        fill="#6366f1"
      />
      
      {/* Hat shadow/depth */}
      <path
        d="M16 4 L20 20 L24 24 L16 22 Z"
        fill="#4338ca"
        opacity="0.6"
      />
      
      {/* Magic star */}
      <path
        d="M16 12 L17 15 L20 15 L17.5 17 L18.5 20 L16 18 L13.5 20 L14.5 17 L12 15 L15 15 Z"
        fill="white"
      />
    </svg>
  );
}
