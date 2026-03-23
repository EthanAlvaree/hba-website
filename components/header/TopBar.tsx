export default function TopBar() {
  return (
    <div className="bg-[#173a63] text-white text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">

        <div className="flex items-center gap-4">
          <input
            placeholder="Search"
            className="bg-transparent border-b border-white/50 outline-none text-sm"
          />
        </div>

        <div className="flex gap-6">
          <a href="#">Parent/Guardian</a>
          <a href="#">Alumni</a>
          <a href="#">School Store</a>
          <a href="#">Calendar</a>
          <a href="#">Blog</a>
          <a href="#">Contact</a>
          
        </div>

      </div>
    </div>
  )
}