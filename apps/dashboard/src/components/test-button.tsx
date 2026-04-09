'use client';

export function TestButton() {
  return (
    <button
      onClick={() => alert('click works!')}
      style={{ padding: '10px 20px', background: 'red', color: 'white', cursor: 'pointer', borderRadius: '8px', marginBottom: '16px' }}
    >
      TEST CLICK
    </button>
  );
}
