import { useState } from 'react';
import utf8 from 'utf8';
import './App.css';

function App() {
  const [ bytes, setBytes ] = useState([]);
  const [ sequence, setSequence ] = useState([]);

  const appendByte = byte => {
    if (sequence.length) {
      if (byte < 0x80) {
        // Error
      } else {

      }
    } else if (byte < 0x80) {
      setBytes(bytes => [...bytes, byte]);
    } else if ((byte & 0xD0) === 0xC0 || (byte & 0xF0) === 0xD0) {
      setSequence([byte]);
    } else {
      // Error
    }


    if (byte === 0xC0 || byte === 0xC1 || byte >= 0xF4) throw Error("Bad Byte");
    if (sequence.length) {
      if (byte < 0x80) {
        throw Error("Bad Byte");
      } else {
        const s0 = sequence[0];
        const len = (s0 & 0xE0) === 0xC0 ? 2 : ((s0 & 0xF0) === 0xE0 ? 3 : ((s0 & 0xF8) === 0xF0 ? 4 : 0));
        if (sequence.length >= len) throw Error("How did we get here?");
        if ((byte & 0xC0) === 0x80) {
          const newSequence = [ ...sequence, byte ];
          if (newSequence.length === len) {
            setBytes([ ...bytes, ...newSequence ]);
            setSequence([]);
          } else {
            setSequence(newSequence);
          }
        }
      }
    } else if (byte < 0x80) {
      return setBytes([ ...bytes, byte ]);
    } else if ((byte & 0xE0) === 0xC0 || (byte & 0xF0) === 0xE0 || (byte & 0xF8) === 0xF0) {
      return setSequence([byte]);
    } else {
      throw Error("Bad Byte");
    }
  };

  function clear () {
    setBytes([]);
    setSequence([]);
  }

  return (
    <div className="App">
      <input
        className="String"
        value={utf8.decode(bytes.map(b => String.fromCharCode(b)).join(""))}
        onChange={e => setBytes([...utf8.encode(e.target.value)].map(s => s.charCodeAt(0)))}
      />
      <p className="Bytes">
        { bytes.length === 0 ? " " : "" } { /* &nbsp; */ }
        { bytes.map(hex).join(" ") }
        <span className="pending">{ sequence.map(hex).join(" ") }</span>
      </p>
      <button onClick={clear}>Clear</button>
      <button onClick={() => setSequence([])}>Cancel</button>
      <table className="ByteTable">
        <thead>
          <tr>
            {
              [...Array(17)].map((_, x) => {
                if (x === 0) return <td></td>;
                return <th key={x-1}>{hex(x-1)}</th>;
              })
            }
          </tr>
        </thead>
        <tbody>
        {
          [...Array(16)].map((_,y) => {
            return (
              <tr key={y}>
                {
                  [...Array(17)].map((_, x) => {
                    if (x === 0) return <th>{hex(y * 0x10)}</th>;
                    const byte = y * 0x10 + (x - 1);
                    const allowed = isAllowed(byte, sequence);
                    const className = !allowed ? "forbidden" : "";
                    return (
                      <td
                        key={byte}
                        className={className}
                        onClick={() => allowed ? appendByte(byte) : null}
                        title={hex(byte)}
                      >
                        { predictString(byte, sequence) }
                      </td>
                    );
                  })
                }
              </tr>
            )
          })
        }
        </tbody>
      </table>
    </div>
  );
}

export default App;

function isAllowed(byte, sequence) {
  if (byte === 0xC0 || byte === 0xC1 || byte >= 0xF4) return false;
  if (sequence.length) {
    if (byte < 0x80) {
      return false;
    } else {
      const s0 = sequence[0];
      const len = (s0 & 0xE0) === 0xC0 ? 2 : ((s0 & 0xF0) === 0xE0 ? 3 : ((s0 & 0xF8) === 0xF0 ? 4 : 0));
      if (sequence.length >= len) throw Error("How did we get here?");
      if ((byte & 0xC0) === 0x80) return true;
    }
  } else if (byte < 0x80) {
    return true;
  } else if ((byte & 0xE0) === 0xC0 || (byte & 0xF0) === 0xE0 || (byte & 0xF8) === 0xF0) {
    return true;
  } else {
    return false;
  }
}

/**
 * @param {number} num
 */
function hex (num) {
  return num.toString(16).padStart(2, "0").toUpperCase();
}

function predictString (byte, sequence) {
  if (byte < 0x20) return String.fromCharCode(0x2400 + byte);
  if (byte === 0x7F) return String.fromCharCode(0x2421);
  if (byte < 0x80) return String.fromCharCode(byte);

  if (!isAllowed(byte, sequence)) return hex(byte);

  const s0 = sequence[0];
  const len = (s0 & 0xE0) === 0xC0 ? 2 : ((s0 & 0xF0) === 0xE0 ? 3 : ((s0 & 0xF8) === 0xF0 ? 4 : 0));
  if (sequence.length === len - 1) {
    return utf8.decode(String.fromCharCode(...sequence, byte));
  }

  return hex(byte);
}