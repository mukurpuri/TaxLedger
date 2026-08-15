import { FormEvent, useState } from 'react';
import { api, type TaxBreakdown } from '../api';

type Props = {
  onCreated: () => void;
};

export function TaxCalculatorForm({ onCreated }: Props) {
  const [grossIncome, setGrossIncome] = useState('1200000');
  const [assessmentYear, setAssessmentYear] = useState('2025-26');
  const [taxRegime, setTaxRegime] = useState<'old' | 'new'>('new');
  const [result, setResult] = useState<TaxBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'calc' | 'save' | null>(null);

  async function calculate(event: FormEvent) {
    event.preventDefault();
    setBusy('calc');
    setError(null);
    try {
      const breakdown = await api.calculateTax({
        grossIncome: Number(grossIncome),
        assessmentYear,
        taxRegime,
      });
      setResult(breakdown);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Unable to calculate tax');
    } finally {
      setBusy(null);
    }
  }

  async function saveFiling() {
    setBusy('save');
    setError(null);
    try {
      await api.createFiling({
        grossIncome: Number(grossIncome),
        assessmentYear,
        taxRegime,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create filing');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Tax calculator</h2>
        <p>Estimate liability under the selected regime, then save it as a draft return.</p>
      </header>
      <form className="stack" onSubmit={calculate}>
        <label>
          Gross income (₹)
          <input
            type="number"
            min={1}
            step={1}
            required
            value={grossIncome}
            onChange={(event) => setGrossIncome(event.target.value)}
          />
        </label>
        <label>
          Assessment year
          <input
            value={assessmentYear}
            onChange={(event) => setAssessmentYear(event.target.value)}
            pattern="[0-9]{4}-[0-9]{2}"
            required
          />
        </label>
        <label>
          Regime
          <select
            value={taxRegime}
            onChange={(event) => setTaxRegime(event.target.value as 'old' | 'new')}
          >
            <option value="new">New</option>
            <option value="old">Old</option>
          </select>
        </label>
        <div className="actions">
          <button type="submit" disabled={busy !== null}>
            {busy === 'calc' ? 'Calculating…' : 'Calculate'}
          </button>
          <button type="button" className="secondary" disabled={busy !== null} onClick={() => void saveFiling()}>
            {busy === 'save' ? 'Saving…' : 'Save as filing'}
          </button>
        </div>
      </form>
      {error ? <p className="banner error">{error}</p> : null}
      {result ? (
        <dl className="breakdown">
          <div>
            <dt>Slab tax</dt>
            <dd>{format(result.slabTax)}</dd>
          </div>
          <div>
            <dt>Section 87A rebate</dt>
            <dd>{format(result.rebate87A)}</dd>
          </div>
          <div>
            <dt>Surcharge</dt>
            <dd>{format(result.surcharge)}</dd>
          </div>
          <div>
            <dt>Cess (4%)</dt>
            <dd>{format(result.cess)}</dd>
          </div>
          <div className="total">
            <dt>Tax payable</dt>
            <dd>{result.formattedTax}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function format(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}
