import React from "react";

export const smokeScenario = {
  id: "smoke",
  title: "Smoke Check",
  render({ components }) {
    const exportNames = Object.keys(components);

    return (
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e3e8ef",
          borderRadius: "16px",
          boxShadow: "0 14px 30px rgba(17, 34, 51, 0.05)",
          padding: "1.25rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Package Export Smoke Check</h2>
        <p>
          {exportNames.length > 0
            ? `Detected exports: ${exportNames.join(", ")}`
            : "No exports yet. Add components to src/ and export them from src/index.ts."}
        </p>
      </section>
    );
  },
};
