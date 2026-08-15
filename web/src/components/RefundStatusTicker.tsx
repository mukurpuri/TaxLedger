import { useFilingStatus } from '../hooks/useFilingStatus';

const STATUS_COPY: Record<string, string> = {
  draft: 'Draft — tax computed, return not yet filed.',
  submitted: 'Submitted — awaiting processing by the assessing officer.',
  processing: 'Processing — the return is under assessment.',
  assessed: 'Assessed — demand or refund has been determined.',
  refund_issued: 'Refund issued — credit has been released.',
};

type Props = {
  filingId: string | null;
};

export function RefundStatusTicker({ filingId }: Props) {
  const { filing, error, loading } = useFilingStatus(filingId);

  return (
    <section className="panel ticker">
      <header className="panel-header">
        <h2>Refund status</h2>
        <p>Live status for the selected filing. Updates every few seconds.</p>
      </header>
      {!filingId ? <p className="muted">Select a filing to watch its status.</p> : null}
      {filingId && loading && !filing ? <p className="muted">Loading status…</p> : null}
      {error ? <p className="banner error">{error}</p> : null}
      {filing ? (
        <div>
          <p className={`status status-${filing.status}`}>{STATUS_COPY[filing.status]}</p>
          <p className="muted">
            AY {filing.assessmentYear} · last updated {new Date(filing.updatedAt).toLocaleString('en-IN')}
          </p>
        </div>
      ) : null}
    </section>
  );
}
