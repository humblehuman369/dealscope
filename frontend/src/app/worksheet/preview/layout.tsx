import '../[id]/worksheet.css'

export default function PreviewWorksheetLayout({
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
