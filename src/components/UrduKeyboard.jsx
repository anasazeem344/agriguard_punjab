const ROWS = [
  ['ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ'],
  ['د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص'],
  ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل'],
  ['م', 'ن', 'ں', 'و', 'ہ', 'ھ', 'ء', 'ی', 'ے'],
];

const UrduKeyboard = ({ value = '', onChange, show }) => {
  if (!show) return null;

  const append = (char) => onChange(value + char);
  const backspace = () => {
    // Urdu characters can be multi-code-point — use spread to slice correctly.
    const chars = [...value];
    onChange(chars.slice(0, -1).join(''));
  };

  return (
    <div className="urdu-keyboard" role="group" aria-label="Urdu keyboard">
      {ROWS.map((row, ri) => (
        <div key={ri} className="urdu-keyboard-row">
          {row.map((char) => (
            <button
              key={char}
              type="button"
              className="urdu-key"
              onMouseDown={(e) => { e.preventDefault(); append(char); }}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
      <div className="urdu-keyboard-row urdu-keyboard-bottom">
        <button
          type="button"
          className="urdu-key urdu-key-space"
          onMouseDown={(e) => { e.preventDefault(); append(' '); }}
        >
          ⎵
        </button>
        <button
          type="button"
          className="urdu-key urdu-key-backspace"
          onMouseDown={(e) => { e.preventDefault(); backspace(); }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
};

export default UrduKeyboard;
