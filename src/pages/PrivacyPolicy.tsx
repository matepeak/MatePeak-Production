import React from "react";

const PrivacyPolicy = () => (
  <div className="max-w-3xl mx-auto px-4 py-16 text-gray-800">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <p className="mb-4">Last updated: October 30, 2025</p>
    <p className="mb-6">
      MatePeak ("we", "us", or "our") is committed to protecting your privacy.
      This Privacy Policy explains how we collect, use, disclose, and safeguard
      your information when you use our platform, including our website,
      applications, and related services (collectively, the "Services").
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      1. Information We Collect
    </h2>
    <ul className="list-disc pl-6 mb-6">
      <li>
        <b>Account Information:</b> Name, email address, password, profile
        photo, and other information you provide when you create an account.
      </li>
      <li>
        <b>Profile & Content:</b> Information you add to your profile, such as
        expertise, education, experience, and any content you upload or share.
      </li>
      <li>
        <b>Usage Data:</b> Details of how you use our Services, including pages
        viewed, features used, and actions taken.
      </li>
      <li>
        <b>Device & Log Data:</b> IP address, browser type, device information,
        operating system, and access times.
      </li>
      <li>
        <b>Cookies & Tracking:</b> We use cookies and similar technologies to
        collect information about your interactions with our Services.
      </li>
      <li>
        <b>Third-Party Data:</b> Information from third-party services (e.g.,
        Google, LinkedIn) if you choose to connect or sign in with them.
      </li>
    </ul>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      2. How We Use Your Information
    </h2>
    <ul className="list-disc pl-6 mb-6">
      <li>To provide, operate, and maintain our Services</li>
      <li>To personalize your experience and recommend mentors or content</li>
      <li>To communicate with you, including service updates and support</li>
      <li>To process transactions and manage your account</li>
      <li>
        To improve our Services, develop new features, and conduct analytics
      </li>
      <li>To protect the security and integrity of our platform</li>
      <li>To comply with legal obligations and enforce our policies</li>
    </ul>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      3. How We Share Your Information
    </h2>
    <ul className="list-disc pl-6 mb-6">
      <li>
        With other users, when you interact or share content on the platform
      </li>
      <li>
        With service providers who help us operate and improve our Services
      </li>
      <li>
        With third-party integrations you choose to use (e.g., Google, LinkedIn)
      </li>
      <li>
        For legal reasons, such as to comply with laws, regulations, or legal
        requests
      </li>
      <li>
        In connection with a business transfer, such as a merger or acquisition
      </li>
    </ul>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      4. Your Choices & Rights
    </h2>
    <ul className="list-disc pl-6 mb-6">
      <li>
        You can access, update, or delete your account information at any time
      </li>
      <li>
        You can manage your communication preferences and opt out of marketing
        emails
      </li>
      <li>
        You can control cookies and tracking through your browser settings
      </li>
      <li>
        Depending on your location, you may have additional rights (e.g., GDPR,
        CCPA)
      </li>
    </ul>

    <h2 className="text-xl font-semibold mt-8 mb-3">5. Data Security</h2>
    <p className="mb-6">
      We use industry-standard security measures to protect your information.
      However, no method of transmission or storage is 100% secure. We encourage
      you to use strong passwords and protect your account.
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Retention</h2>
    <p className="mb-6">
      We retain your information as long as your account is active or as needed
      to provide our Services, comply with legal obligations, resolve disputes,
      and enforce our agreements.
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      7. International Data Transfers
    </h2>
    <p className="mb-6">
      Your information may be transferred to and processed in countries other
      than your own. We take steps to ensure your data is protected in
      accordance with this policy.
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">8. Children's Privacy</h2>
    <p className="mb-6">
      Our Services are not intended for children under 16. We do not knowingly
      collect personal information from children under 16. If you believe a
      child has provided us with personal information, please contact us.
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">
      9. Changes to This Policy
    </h2>
    <p className="mb-6">
      We may update this Privacy Policy from time to time. We will notify you of
      any material changes by posting the new policy on this page and updating
      the "Last updated" date.
    </p>

    <h2 className="text-xl font-semibold mt-8 mb-3">10. Contact Us</h2>
    <p className="mb-6">
      If you have any questions or concerns about this Privacy Policy or our
      data practices, please contact us at{" "}
      <a
        href="mailto:support@matepeak.com"
        className="text-matepeak-primary underline"
      >
        support@matepeak.com
      </a>
      .
    </p>
  </div>
);

export default PrivacyPolicy;
