import { BookOpen } from "lucide-react";

const CollectionMessage = ({ title, description, children, role }) => (
  <div
    className="flex flex-col items-center gap-3.5 px-4 py-16 text-center text-muted"
    role={role}
  >
    <BookOpen
      className="text-primary"
      size={40}
      strokeWidth={1.4}
      aria-hidden="true"
    />
    <h3 className="text-lg text-heading sm:text-xl">{title}</h3>
    <p className="text-sm sm:text-base">{description}</p>
    {/* A página fornece a ação adequada para cada estado, quando houver. */}
    {children}
  </div>
);

export default CollectionMessage;
