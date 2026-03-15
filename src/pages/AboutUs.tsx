import React from "react";

const AboutUs = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-gray-800 bg-white">
      <h1 className="text-4xl font-extrabold mb-8 text-black">
        About MatePeak
      </h1>
      <p className="mb-10 text-lg text-gray-700 leading-relaxed">
        MatePeak is a global platform dedicated to connecting learners with
        expert mentors across a wide range of fields. Our mission is to empower
        individuals to achieve their personal and professional goals by making
        world-class mentorship accessible, affordable, and impactful.
      </p>
      <p className="mb-10 text-lg text-gray-700 leading-relaxed">
        MatePeak is a global platform dedicated to connecting learners with
        expert mentors across a wide range of fields. Our mission is to empower
        individuals to achieve their personal and professional goals by making
        world-class mentorship accessible, affordable, and impactful.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Our Story</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <p className="text-gray-700 leading-relaxed">
          Founded in 2025, MatePeak was born out of the belief that everyone
          deserves access to the right guidance at the right time. We recognized
          the challenges learners face in finding credible mentors and the
          barriers experts encounter in sharing their knowledge. MatePeak
          bridges this gap by providing a seamless, secure, and user-friendly
          platform for mentorship.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Our Mission</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <p className="mb-4 text-gray-700 leading-relaxed">
          To democratize mentorship and foster a culture of continuous learning,
          growth, and collaboration. We strive to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Connect learners with vetted, experienced mentors worldwide</li>
          <li>Enable flexible, personalized mentorship experiences</li>
          <li>
            Support experts in sharing their knowledge and building their
            personal brands
          </li>
          <li>
            Promote diversity, inclusion, and equal opportunity in education and
            career development
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">What We Offer</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <span className="font-semibold">Expert Mentors:</span> A diverse
            network of professionals from top industries and institutions
          </li>
          <li>
            <span className="font-semibold">Personalized Matching:</span> Smart
            algorithms to connect you with the right mentor for your needs
          </li>
          <li>
            <span className="font-semibold">Flexible Sessions:</span> Book 1:1
            sessions, group workshops, or ongoing mentorship
          </li>
          <li>
            <span className="font-semibold">Secure Platform:</span> Safe,
            private, and easy-to-use tools for communication and payments
          </li>
          <li>
            <span className="font-semibold">Global Community:</span> Join a
            vibrant community of learners and mentors from around the world
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Our Values</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <span className="font-semibold">Integrity:</span> We are committed
            to transparency, honesty, and ethical practices
          </li>
          <li>
            <span className="font-semibold">Empowerment:</span> We believe in
            enabling people to reach their full potential
          </li>
          <li>
            <span className="font-semibold">Innovation:</span> We embrace
            technology and creativity to solve real-world problems
          </li>
          <li>
            <span className="font-semibold">Community:</span> We foster a
            supportive, inclusive, and collaborative environment
          </li>
          <li>
            <span className="font-semibold">Excellence:</span> We strive for the
            highest standards in everything we do
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Meet the Team</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <p className="text-gray-700 leading-relaxed">
          Our team is made up of passionate educators, technologists, and
          industry leaders who are dedicated to making mentorship accessible to
          all. We are united by our vision to transform the way people learn and
          grow.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Contact Us</h2>
        <div className="h-[2px] w-12 bg-matepeak-primary mb-5 rounded-full" />
        <p className="mb-2 text-gray-700">
          We'd love to hear from you! For questions, feedback, or partnership
          opportunities, please reach out to us at{" "}
          <a
            href="mailto:support@matepeak.com"
            className="text-matepeak-primary underline"
          >
            support@matepeak.com
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">
          Follow us on social media to stay updated on the latest news and
          opportunities.
        </p>
      </section>
    </div>
  );
};

export default AboutUs;
