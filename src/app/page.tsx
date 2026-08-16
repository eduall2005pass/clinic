import Hero from "@/components/home/Hero";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import Mentors from "@/components/home/Mentors";
import FinalCTA from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <main className="flex-1 bg-dark-950">
      <Hero />
      <FeaturedCourses />
      <WhyMediSpark />
      <Mentors />
      <FinalCTA />
    </main>
  );
}