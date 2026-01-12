import './worksheet.css'

export default function WorksheetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="worksheet-container">
      {children}
    </div>
  )
}

