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

export default function Mentors() {
  return (
    <section className="border-t border-white/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Our Mentors"
          title="Learn from experienced mentors"
          description="Mentor profiles will grow as the platform expands."
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => (
            <article
              key={mentor.name}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition hover:border-primary-500/60 hover:bg-white/[0.07]"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xl font-extrabold text-white">
                {mentor.initials}
              </div>
              <h3 className="mt-4 font-bold text-white">{mentor.name}</h3>
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