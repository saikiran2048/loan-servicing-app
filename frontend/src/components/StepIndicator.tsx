interface Props {
  current: 1 | 2 | 3;
}

const STEPS = ['Verify Identity', 'Account Setup', 'Verify Email'];

export default function StepIndicator({ current }: Props) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const state = num < current ? 'done' : num === current ? 'active' : 'inactive';
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', flex: num < STEPS.length ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div className={`step-dot ${state}`}>
                {state === 'done' ? '✓' : num}
              </div>
              <span style={{ fontSize: 10, color: state === 'active' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: state === 'active' ? 700 : 400, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {num < STEPS.length && (
              <div className={`step-line ${state === 'done' ? 'done' : ''}`} style={{ margin: '0 8px', marginBottom: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
