import { useEffect, useState } from 'react';
import { api, type Filing } from '../api';

const STATUS_LABEL: Record<Filing['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  processing: 'Processing',
  assessed: 'Assessed',
  refund_issued: 'Refund issued',
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

type Props = {
  refreshKey: number;
  onSelectFiling: (id: string) => void;
  selectedId: string | null;
};

export function FilingDashboard({ refreshKey, onSelectFiling, selectedId }: Props) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listFilings()
      .then((result) => {
        if (!cancelled) {
          setFilings(result.filings);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load filings');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function payAndSubmit(filing: Filing) {
    setBusyId(filing.id);
    setError(null);
    try {
      if (filing.computedTax > 0) {
        await api.payFiling(filing.id, filing.computedTax);
      }
      await api.submitFiling(filing.id);
      const result = await api.listFilings();
      setFilings(result.filings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit filing');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Filings</h2>
        <p>Returns for each assessment year, with computed tax and current status.</p>
      </header>
      {error ? <p className="banner error">{error}</p> : null}
      {filings.length === 0 ? (
        <p className="muted">No filings yet. Compute tax and save a return to see it here.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>AY</th>
              <th>Regime</th>
              <th>Gross income</th>
              <th>Tax</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filings.map((filing) => (
              <tr
                key={filing.id}
                className={selectedId === filing.id ? 'selected' : undefined}
                onClick={() => onSelectFiling(filing.id)}
              >
                <td>{filing.assessmentYear}</td>
                <td>{filing.taxRegime}</td>
                <td>{formatInr(filing.grossIncome)}</td>
                <td>{formatInr(filing.computedTax)}</td>
                <td>
                  <span className={`status status-${filing.status}`}>
                    {STATUS_LABEL[filing.status]}
                  </span>
                </td>
                <td>
                  {filing.status === 'draft' ? (
                    <button
                      type="button"
                      disabled={busyId === filing.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void payAndSubmit(filing);
                      }}
                    >
                      {busyId === filing.id ? 'Working…' : 'Pay & submit'}
                    </button>
                  ) : (
                    <span className="muted">Track</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
