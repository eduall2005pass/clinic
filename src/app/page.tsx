import BannerSlider from "@/components/home/BannerSlider";
import Hero from "@/components/home/Hero";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import OurSuccess from "@/components/home/OurSuccess";
import Mentors from "@/components/home/Mentors";
import StudentReviews from "@/components/home/StudentReviews";
import FaqSection from "@/components/home/FaqSection";

export default function HomePage() {
  return (
    <main className="flex-1 bg-dark-950">
      <BannerSlider />
      <Hero />
      <FeaturedCourses />
      <WhyMediSpark />
      <OurSuccess />
      <Mentors />
      <StudentReviews />
      <FaqSection />
    </main>
  );
}