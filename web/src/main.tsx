import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { convertWei } from './conversion';
import './styles.css';

function Icon({ kind }: { kind: 'copy' | 'arrow' | 'check' | 'lock' }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function Result({ unit, value, divisor, tinted }: { unit: 'gwei' | 'ETH'; value?: string; divisor: string; tinted?: boolean }) {
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const valueRef = useRef<HTMLOutputElement>(null);
  const currentValue = useRef(value);
  currentValue.current = value;

  useEffect(() => { setFeedback(''); setCopied(false); }, [value]);

  async function copy() {
    if (value === undefined) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (currentValue.current !== value) return;
      setCopied(true);
      setFeedback(`${unit} amount copied.`);
    } catch {
      if (currentValue.current !== value) return;
      if (valueRef.current) {
        const range = document.createRange();
        range.selectNodeContents(valueRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setFeedback(`Copy is unavailable here. The ${unit} amount is selected; use your device’s copy command.`);
    }
  }

  return <section className={`result-card${tinted ? ' result-card-tinted' : ''}`} aria-labelledby={`${unit}-label`}>
    <div className="result-heading">
      <h3 id={`${unit}-label`}>{unit === 'gwei' ? 'Gwei' : 'Ether'} <span className="unit-tag">{unit}</span></h3>
      <button type="button" className="copy-button" onClick={copy} disabled={value === undefined} aria-label={`Copy ${unit} amount`}>
        <Icon kind={copied ? 'check' : 'copy'} /><span>Copy</span>
      </button>
    </div>
    <output ref={valueRef} id={`${unit}-result`} htmlFor="wei" aria-live="off" className={`result-value${value && value.length > 14 ? ' result-value-long' : ''}`}>{value ?? '—'}</output>
    <p className="formula">wei ÷ {divisor}</p>
    <p className="copy-feedback" role="status">{feedback}</p>
  </section>;
}

function App() {
  const [input, setInput] = useState('1000000000');
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const result = convertWei(input);

  useEffect(() => {
    const next = convertWei(input);
    const timer = window.setTimeout(() => setAnnouncement(
      next.state === 'valid' ? `${next.gwei} gwei. ${next.eth} ETH.` : next.state === 'empty' ? 'Enter wei to see the converted amounts.' : next.error,
    ), 450);
    return () => window.clearTimeout(timer);
  }, [input]);

  function chooseExample(value: string) {
    setInput(value);
    inputRef.current?.focus();
  }

  return <div className="page-shell">
    <header className="site-header">
      <div className="wordmark"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Unit desk<span className="wordmark-dot">.</span></span></div>
      <span className="header-note">A little clarity for every wei</span>
    </header>
    <main>
      <div className="intro">
        <p className="eyebrow"><span className="eyebrow-line" />Ethereum unit converter</p>
        <h1>Gas calculator<span className="title-dot">.</span></h1>
        <p className="intro-description">From wei to gwei to ETH.<br className="mobile-break" /> All your digits, in the right place.</p>
      </div>

      <div className="calculator">
        <section className="input-panel" aria-labelledby="input-title">
          <div className="section-label"><span className="step">01</span><h2 id="input-title">Start with wei</h2></div>
          <p className="panel-description">Enter an amount. The conversion is instant.</p>
          <div className="field-heading"><label htmlFor="wei">Amount in wei</label><button type="button" className="clear-button" onClick={() => chooseExample('')}>Clear</button></div>
          <div className={`input-wrap${result.state === 'invalid' ? ' input-wrap-error' : ''}`}>
            <input ref={inputRef} id="wei" name="wei" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={input} onChange={event => setInput(event.target.value)} aria-invalid={result.state === 'invalid'} aria-describedby={result.state === 'invalid' ? 'input-error input-hint' : 'input-hint'} placeholder="e.g. 1000000000" />
            <span className="input-suffix" aria-hidden="true">wei</span>
          </div>
          <p id="input-hint" className="field-hint">Whole numbers only. Commas are welcome.</p>
          {result.state === 'invalid' && <p id="input-error" className="field-error">{result.error}</p>}
          <div className="examples"><p>Try an example</p><div className="example-buttons">
            <button type="button" onClick={() => chooseExample('1')}>1 wei<Icon kind="arrow" /></button>
            <button type="button" onClick={() => chooseExample('1000000000')}>1 gwei<Icon kind="arrow" /></button>
            <button type="button" onClick={() => chooseExample('1000000000000000000')}>1 ETH<Icon kind="arrow" /></button>
          </div></div>
          <div className="precision-note"><span className="precision-icon"><Icon kind="check" /></span><p><strong>Exact, down to the last wei.</strong><span>No rounding. No scientific notation.</span></p></div>
        </section>
        <section className="results-panel" aria-labelledby="results-title">
          <div className="section-label result-section-label"><span className="step">02</span><h2 id="results-title">Your conversion</h2><span className="live-label">{result.state === 'valid' ? 'Exact result' : 'Awaiting wei'}</span></div>
          {result.state !== 'valid' && <p className="result-prompt">{result.state === 'empty' ? 'Enter wei or choose an example to get started.' : 'Check the wei amount to see your conversion.'}</p>}
          <Result unit="gwei" value={result.state === 'valid' ? result.gwei : undefined} divisor="1,000,000,000" tinted />
          <Result unit="ETH" value={result.state === 'valid' ? result.eth : undefined} divisor="1,000,000,000,000,000,000" />
        </section>
      </div>
      <p className="sr-only" role="status" aria-atomic="true">{announcement}</p>

      <section className="reference" aria-labelledby="reference-title">
        <div className="reference-intro"><span className="reference-icon" aria-hidden="true">=</span><div><h2 id="reference-title">Same amount. Different units.</h2><p>A quick reference for the numbers.</p></div></div>
        <dl className="unit-reference"><div><dt>1 gwei</dt><dd>10<sup>9</sup> wei<span>One billion wei</span></dd></div><div><dt>1 ETH</dt><dd>10<sup>18</sup> wei<span>One quintillion wei</span></dd></div><div><dt>1 ETH</dt><dd>10<sup>9</sup> gwei<span>One billion gwei</span></dd></div></dl>
      </section>
      <p className="scope-note">Converts units only. A transaction fee also depends on gas used and the price per unit of gas.</p>
    </main>
    <footer><span><Icon kind="lock" />Calculated on your device</span><span>No connection needed<span className="footer-dot">·</span>No data stored</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
