interface BreadcrumbsProps {
  items: string[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="bg-gray-100 py-4">
      <div className="max-w-7xl mx-auto text-sm text-gray-600">
        {items.map((item, i) => (
          <span key={i}>
            {item}
            {i < items.length - 1 && " / "}
          </span>
        ))}
      </div>
    </div>
  )
}
