import SectionHeader from "@/components/SectionHeader";

type Mentor = {
  name: string;
  subject: string;
  note: string;
  initials: string;
};

const mentors: Mentor[] = [
  {
    name: "Dr. Anika Rahman",
    subject: "Biology & Anatomy",
    note: "Makes complex biology topics simple and exam-focused.",
    initials: "AR",
  },
  {
    name: "Prof. Shafiqul Islam",
    subject: "Chemistry",
    note: "Guides students through every chapter with clarity.",
    initials: "SI",
  },
  {
    name: "Dr. Farhana Akter",
    subject: "Physics & Mathematics",
    note: "Builds strong concepts with real exam practice.",
    initials: "FA",
  },
];

export default  function Mentors({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  return (
    <section id="mentors" className="relative scroll-mt-24 overflow-hidden border-t border-ink/5 bg-dark-950">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Our Mentors"
          title={title ?? "Learn from experienced mentors"}
          description={description ?? "Mentor profiles will grow as the platform expands."}
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => (
            <article
              key={mentor.name}
              className="group rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xl font-extrabold text-white shadow-lg shadow-primary-900/40 transition group-hover:shadow-primary-800/50">
                {mentor.initials}
              </div>
              <h3 className="mt-4 font-bold text-heading">{mentor.name}</h3>
              <p className="mt-1 text-sm font-medium text-primary-400">
                {mentor.subject}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {mentor.note}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}