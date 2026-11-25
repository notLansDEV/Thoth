export default function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="skel skel-title" />
      <div className="skel skel-sub" />
      <div className="skel-cards">
        <div className="skel skel-card" />
        <div className="skel skel-card" />
        <div className="skel skel-card" />
        <div className="skel skel-card" />
      </div>
      <div className="skel skel-panel" />
      <div className="skel skel-panel skel-panel-sm" />
    </div>
  )
}
