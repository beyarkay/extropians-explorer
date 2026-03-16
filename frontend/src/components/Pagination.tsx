interface Props {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← prev</button>
      <span className="page-info">{page}/{totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>next →</button>
    </div>
  )
}
