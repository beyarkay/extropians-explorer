import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  data: { month: string; count: number }[]
  height?: number
  title?: string
  selectedMonth?: string | null
  onBarClick?: (month: string) => void
}

export default function ActivityChart({ data, height = 140, title, selectedMonth, onBarClick }: Props) {
  return (
    <div className="timeline-chart">
      {title && <h2>{title}</h2>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          onClick={onBarClick ? (e: any) => e?.activePayload && onBarClick(e.activePayload[0].payload.month) : undefined}
        >
          <XAxis
            dataKey="month"
            tick={{ fill: '#6e7681', fontSize: 9 }}
            tickFormatter={(v: string) => {
              const [y, m] = v.split('-')
              return m === '01' ? y : ''
            }}
            interval={0}
          />
          <YAxis tick={{ fill: '#6e7681', fontSize: 9 }} width={30} />
          <Tooltip
            contentStyle={{ background: '#141419', border: '1px solid #2a2a35', borderRadius: 3, fontSize: 11 }}
            labelStyle={{ color: '#e6edf3' }}
            itemStyle={{ color: '#8b949e' }}
          />
          <Bar dataKey="count" fill="#58a6ff" radius={[1, 1, 0, 0]} cursor={onBarClick ? 'pointer' : undefined}>
            {selectedMonth != null && data.map((entry) => (
              <Cell key={entry.month} fill={entry.month === selectedMonth ? '#58a6ff' : '#2a2a35'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
