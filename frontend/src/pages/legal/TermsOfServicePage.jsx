"use client";

import React from "react";
import {
  ArrowLeft,
  FileText,
  User,
  ShieldAlert,
  Smartphone,
  Zap,
  Ban,
  Scale,
  Mail,
  List,
  Gavel,
  AlertTriangle,
  Key,
  UserCheck,
  Clock,
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_INFO } from "@/constants";
import ConnectoLogo from "@/components/common/ConnectoLogo";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  const sections = [
    { id: "overview", title: "Overview", icon: FileText },
    { id: "acceptance", title: "Acceptance of Terms", icon: Gavel },
    { id: "eligibility", title: "Eligibility", icon: User },

    { id: "accounts", title: "Accounts & Devices", icon: Smartphone },
    { id: "security", title: "Account Security", icon: ShieldAlert },
    { id: "account-device", title: "Account & Device Responsibility", icon: Smartphone },

    { id: "acceptable-use", title: "Acceptable Use", icon: AlertTriangle },
    { id: "prohibited-conduct", title: "Prohibited Conduct", icon: Ban },
    { id: "encryption-misuse", title: "Encryption & Feature Misuse", icon: Key },

    { id: "user-safety", title: "User Safety & Reporting", icon: UserCheck },
    { id: "service-integrity", title: "Platform Integrity & Fair Use", icon: Scale },

    { id: "sessions", title: "Device & Session Control", icon: Zap },
    { id: "device-removal-effects", title: "Effects of Device Removal", icon: Smartphone },

    { id: "service-availability", title: "Service Availability", icon: Clock },
    { id: "feature-changes", title: "Feature Changes & Improvements", icon: Zap },
    { id: "beta-features", title: "Beta & Experimental Features", icon: ShieldAlert },

    { id: "termination", title: "Account Suspension & Termination", icon: Ban },
    { id: "investigations", title: "Investigations & Review", icon: ShieldAlert },
    { id: "user-initiated-termination", title: "User-Initiated Account Termination", icon: User },
    { id: "termination-effects", title: "Effects of Suspension or Termination", icon: Smartphone },
    { id: "no-circumvention", title: "No Circumvention", icon: Scale },

    { id: "no-warranty", title: "No Warranty", icon: ShieldAlert },
    { id: "user-responsibility", title: "User Responsibility & Risk Acknowledgement", icon: User },
    { id: "limitation-of-liability", title: "Limitation of Liability", icon: Scale },
    { id: "third-party-liability", title: "Third-Party Services & Liability", icon: Database },

    { id: "governing-law", title: "Governing Law", icon: Scale },
    { id: "dispute-resolution", title: "Dispute Resolution", icon: ShieldAlert },
    { id: "severability", title: "Severability", icon: FileText },
    { id: "no-waiver", title: "No Waiver", icon: ShieldAlert },

    { id: "changes-to-terms", title: "Changes to These Terms", icon: Clock },
    { id: "entire-agreement", title: "Entire Agreement", icon: FileText },
    { id: "contact", title: "Contact Information", icon: Mail },
    { id: "final-acknowledgement", title: "Final Acknowledgement", icon: User },
  ];



  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            <ConnectoLogo size={42} />
            <div>
              <h1 className="text-xl font-semibold">Terms of Service</h1>
              <p className="text-xs text-muted-foreground">
                Last updated: January 2026
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Contents */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border bg-card p-4 max-h-[calc(100vh-3rem)] overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Contents</span>
              </div>

              <nav className="flex flex-col gap-1 overflow-y-auto scroll-thumb-only pr-1 max-h-[calc(100vh-6rem)]">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className="flex items-center justify-start gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition text-start"
                    >
                      <Icon className="w-4 h-4 text-primary/80 shrink-0" />
                      {s.title}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">

            <Section id="overview" icon={FileText} title="Overview">
              <p>
                These Terms of Service govern your use of {APP_INFO?.name || "Connecto"}.
                They define how the service may be used, what responsibilities users have,
                and how the platform operates.
              </p>

              <p className="mt-3">
                The service is designed to provide secure, private communication while
                maintaining a safe and lawful environment for all users.
              </p>

              <p className="mt-3">
                By using the app, you agree to follow these terms and to use the platform
                responsibly and respectfully.
              </p>
            </Section>


            <Section id="acceptance" icon={Gavel} title="Acceptance of Terms">
              <p>
                By creating an account, accessing, or using {APP_INFO?.name || "Connecto"},
                you confirm that you have read, understood, and agreed to these Terms of
                Service.
              </p>

              <p className="mt-3">
                These terms apply to all users, including visitors, registered users,
                and anyone accessing the service through a device or application.
              </p>

              <p className="mt-3">
                If you do not agree with these terms, you must discontinue use of the
                service immediately.
              </p>
            </Section>

            <Section id="eligibility" icon={User} title="Eligibility">
              <p>
                You must be legally permitted to use online communication services in
                your jurisdiction to use {APP_INFO?.name || "Connecto"}.
              </p>

              <p className="mt-3">
                By using the service, you represent that:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>You meet the minimum age requirements applicable in your country</li>
                <li>You are not prohibited from using such services by law</li>
                <li>You are using the service for lawful purposes only</li>
              </ul>

              <p className="mt-3">
                If you do not meet these requirements, you may not use the service.
              </p>
            </Section>

            <Section id="accounts" icon={Smartphone} title="Accounts & Devices">
              <p>
                Your account allows you to access {APP_INFO?.name || "Connecto"} across
                one or more devices. Each device linked to your account acts as a separate
                access point.
              </p>

              <p className="mt-3">
                You are responsible for all activity that occurs through your account,
                including actions taken from any linked device.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>You may sign in on multiple devices</li>
                <li>Each device maintains its own session</li>
                <li>You can remove or log out devices at any time</li>
              </ul>

              <p className="mt-3">
                Removing a device immediately revokes its access to the service.
              </p>
            </Section>

            <Section id="security" icon={ShieldAlert} title="Account Security">
              <p>
                Keeping your account secure is important to protect your data and
                communications.
              </p>

              <p className="mt-3">
                You agree to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Keep your verification codes and login methods confidential</li>
                <li>Not share access to your account with others</li>
                <li>Remove devices you no longer control</li>
              </ul>

              <p className="mt-3">
                If you believe your account or a linked device has been compromised,
                you should take immediate action by removing the device and contacting
                support if necessary.
              </p>
            </Section>

            <Section
              id="account-device"
              icon={Smartphone}
              title="Account & Device Responsibility"
            >
              <p>
                Your account allows you to access {APP_INFO?.name || "Connecto"} across one
                or more devices. Each device linked to your account functions as a separate
                access point.
              </p>

              <p className="mt-3">
                You are responsible for all activity that occurs through your account,
                including activity initiated from any device connected to it.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Keeping your login methods and verification codes confidential</li>
                <li>Ensuring only authorized devices are linked to your account</li>
                <li>Removing devices you no longer control or recognize</li>
              </ul>

              <p className="mt-3">
                If you believe your account or a linked device has been accessed without
                authorization, you should immediately remove the device and secure your
                account.
              </p>
            </Section>

            <Section
              id="acceptable-use"
              icon={ShieldAlert}
              title="Acceptable Use"
            >
              <p>
                {APP_INFO?.name || "Connecto"} is intended to provide a secure, respectful,
                and lawful communication environment. You agree to use the service only for
                legitimate personal or professional communication.
              </p>

              <p className="mt-3">
                When using the service, you agree to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Comply with all applicable local, national, and international laws</li>
                <li>Respect the rights, privacy, and safety of other users</li>
                <li>Use communication features in a responsible and non-abusive manner</li>
              </ul>

              <p className="mt-3">
                The service may include messaging, file sharing, voice and video calls, and
                group communication features. All usage must align with these principles.
              </p>
            </Section>

            <Section
              id="prohibited-conduct"
              icon={Ban}
              title="Prohibited Conduct"
            >
              <p>
                To protect users and the integrity of the platform, certain activities are
                strictly prohibited.
              </p>

              <p className="mt-3">
                You must not use {APP_INFO?.name || "Connecto"} to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Engage in harassment, abuse, threats, or hate speech</li>
                <li>Send unsolicited, deceptive, or harmful content</li>
                <li>Distribute malware, viruses, or malicious code</li>
                <li>Impersonate another person or misrepresent your identity</li>
                <li>Exploit, reverse engineer, or interfere with security mechanisms</li>
                <li>Attempt to access data, devices, or accounts without authorization</li>
              </ul>

              <p className="mt-3">
                Violations of these rules may result in temporary restrictions, account
                suspension, or permanent termination.
              </p>
            </Section>

            <Section
              id="encryption-misuse"
              icon={Key}
              title="Encryption & Feature Misuse"
            >
              <p>
                {APP_INFO?.name || "Connecto"} uses encryption and security technologies to
                protect user communications. These technologies are provided for privacy
                and safety, not for misuse.
              </p>

              <p className="mt-3">
                You agree not to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Attempt to weaken, bypass, or exploit encryption mechanisms</li>
                <li>Use encryption features to conceal illegal activity</li>
                <li>Modify or misuse client software to gain unauthorized access</li>
              </ul>

              <p className="mt-3">
                While message content is private, the service may take action when there is
                credible evidence of abuse, legal violations, or harm to others, based on
                permitted metadata and reports.
              </p>
            </Section>

            <Section
              id="user-safety"
              icon={UserCheck}
              title="User Safety & Reporting"
            >
              <p>
                Your safety and well-being are important. The service provides tools to help
                you manage interactions and prevent unwanted communication.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Block users or conversations you do not wish to engage with</li>
                <li>Leave or mute group conversations</li>
                <li>Report misuse or violations to the support team</li>
              </ul>

              <p className="mt-3">
                Reports are reviewed and handled in accordance with applicable laws and our
                internal policies. We may take appropriate action to protect users and the
                platform.
              </p>
            </Section>

            <Section
              id="service-integrity"
              icon={Scale}
              title="Platform Integrity & Fair Use"
            >
              <p>
                You agree not to interfere with the normal operation of the service or
                degrade the experience for other users.
              </p>

              <p className="mt-3">
                This includes, but is not limited to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Excessive automated usage or abuse of system resources</li>
                <li>Attempts to disrupt servers, networks, or infrastructure</li>
                <li>Circumventing usage limits or safeguards</li>
              </ul>

              <p className="mt-3">
                We may apply technical controls or restrictions to ensure reliable service
                availability and fair usage for all users.
              </p>
            </Section>


            <Section
              id="sessions"
              icon={Zap}
              title="Device & Session Control"
            >
              <p>
                {APP_INFO?.name || "Connecto"} manages access using device-specific sessions.
                Each device you sign in on maintains its own independent session.
              </p>

              <p className="mt-3">
                This design allows you to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Stay signed in on multiple devices simultaneously</li>
                <li>Log out individual devices without affecting others</li>
                <li>Immediately revoke access from lost or unused devices</li>
              </ul>

              <p className="mt-3">
                When you log out from a device, its session is invalidated immediately and
                cannot be reused. You must sign in again to regain access from that device.
              </p>
            </Section>

            <Section
              id="device-removal-effects"
              icon={Smartphone}
              title="Effects of Device Removal"
            >
              <p>
                Removing a device from your account has immediate security consequences.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>The device is signed out instantly</li>
                <li>It can no longer receive messages or calls</li>
                <li>It cannot decrypt future messages</li>
              </ul>

              <p className="mt-3">
                Messages already received on that device remain accessible locally, but the
                removed device will not receive new encrypted content going forward.
              </p>

              <p className="mt-3">
                Device removal does not notify other users and does not delete conversations
                for other participants.
              </p>
            </Section>

            <Section
              id="service-availability"
              icon={Clock}
              title="Service Availability"
            >
              <p>
                We strive to provide a reliable and continuously available service.
                However, uninterrupted access cannot be guaranteed at all times.
              </p>

              <p className="mt-3">
                Temporary interruptions may occur due to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Scheduled maintenance or upgrades</li>
                <li>Unexpected technical issues</li>
                <li>Network or infrastructure outages</li>
              </ul>

              <p className="mt-3">
                When possible, maintenance activities are planned to minimize disruption.
                We are not responsible for service interruptions beyond our reasonable
                control.
              </p>
            </Section>

            <Section
              id="feature-changes"
              icon={Zap}
              title="Feature Changes & Improvements"
            >
              <p>
                {APP_INFO?.name || "Connecto"} evolves over time. We may add, modify, or
                remove features to improve security, performance, or usability.
              </p>

              <p className="mt-3">
                Changes may include:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>New communication or privacy features</li>
                <li>Updates to existing functionality</li>
                <li>Deprecation of outdated or unused features</li>
              </ul>

              <p className="mt-3">
                Where changes materially affect user experience or rights, we will make
                reasonable efforts to inform users through in-app notices or updates.
              </p>
            </Section>

            <Section
              id="beta-features"
              icon={ShieldAlert}
              title="Beta & Experimental Features"
            >
              <p>
                Some features may be labeled as beta or experimental.
              </p>

              <p className="mt-3">
                These features are provided for testing and feedback purposes and may:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Contain bugs or incomplete functionality</li>
                <li>Change significantly before final release</li>
                <li>Be removed without prior notice</li>
              </ul>

              <p className="mt-3">
                Use of beta features is optional and provided without guarantees.
              </p>
            </Section>

            <Section
              id="termination"
              icon={Ban}
              title="Account Suspension & Termination"
            >
              <p>
                To protect users and maintain the integrity of the platform,
                {APP_INFO?.name || "Connecto"} reserves the right to restrict, suspend,
                or terminate accounts that violate these Terms of Service.
              </p>

              <p className="mt-3">
                Enforcement actions may be taken when we reasonably believe that an account:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Violates applicable laws or regulations</li>
                <li>Engages in abuse, harassment, or harmful behavior</li>
                <li>Attempts to bypass security or encryption safeguards</li>
                <li>Threatens the safety, privacy, or experience of other users</li>
              </ul>

              <p className="mt-3">
                Actions may include temporary suspension, feature limitations, or permanent
                account termination depending on severity.
              </p>
            </Section>

            <Section
              id="investigations"
              icon={ShieldAlert}
              title="Investigations & Review"
            >
              <p>
                We may review account activity to investigate suspected violations of these
                terms or to comply with legal obligations.
              </p>

              <p className="mt-3">
                Reviews are conducted with care and focus on protecting user privacy.
                End-to-end encrypted message content remains inaccessible and unreadable
                to the service.
              </p>

              <p className="mt-3">
                During an investigation, we may temporarily restrict access to certain
                features to prevent further harm.
              </p>
            </Section>

            <Section
              id="user-initiated-termination"
              icon={User}
              title="User-Initiated Account Termination"
            >
              <p>
                You may choose to stop using {APP_INFO?.name || "Connecto"} and delete your
                account at any time through the app settings.
              </p>

              <p className="mt-3">
                When you request account deletion:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Your profile and account data are scheduled for removal</li>
                <li>All active sessions are terminated</li>
                <li>You lose access to messages and contacts on your devices</li>
              </ul>

              <p className="mt-3">
                Messages you previously sent may remain visible in conversations for other
                users, but will no longer be associated with your active account.
              </p>
            </Section>

            <Section
              id="termination-effects"
              icon={Smartphone}
              title="Effects of Suspension or Termination"
            >
              <p>
                When an account is suspended or terminated, access to the service is
                restricted or permanently revoked.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>You may no longer sign in or access your account</li>
                <li>Linked devices lose the ability to connect</li>
                <li>Messages and calls can no longer be sent or received</li>
              </ul>

              <p className="mt-3">
                Suspension or termination does not affect the visibility of messages
                already received by other users.
              </p>
            </Section>

            <Section
              id="no-circumvention"
              icon={Scale}
              title="No Circumvention"
            >
              <p>
                You agree not to attempt to circumvent enforcement actions.
              </p>

              <p className="mt-3">
                This includes, but is not limited to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Creating new accounts to bypass suspension or bans</li>
                <li>Using modified clients or automation tools</li>
                <li>Interfering with security or abuse-prevention mechanisms</li>
              </ul>

              <p className="mt-3">
                Attempts to bypass restrictions may result in permanent and irreversible
                termination of access.
              </p>
            </Section>



            <Section
              id="no-warranty"
              icon={ShieldAlert}
              title="No Warranty"
            >
              <p>
                The service is provided without warranties of any kind, whether express
                or implied.
              </p>

              <p className="mt-3">
                To the fullest extent permitted by law, {APP_INFO?.name || "Connecto"}
                disclaims all warranties, including but not limited to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Fitness for a particular purpose</li>
                <li>Merchantability</li>
                <li>Accuracy or reliability of content delivery</li>
                <li>Availability or error-free operation</li>
              </ul>

              <p className="mt-3">
                We do not guarantee that the service will meet your specific needs or
                expectations.
              </p>
            </Section>

            <Section
              id="user-responsibility"
              icon={User}
              title="User Responsibility & Risk Acknowledgement"
            >
              <p>
                You acknowledge that using a real-time communication service involves
                inherent risks, including device compromise, data loss, or unauthorized
                access due to factors outside our control.
              </p>

              <p className="mt-3">
                You are responsible for:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Securing your devices and accounts</li>
                <li>Keeping operating systems and apps up to date</li>
                <li>Protecting access to your email and authentication methods</li>
                <li>Removing lost or compromised devices promptly</li>
              </ul>

              <p className="mt-3">
                Failure to follow basic security practices may result in loss of access
                or data, for which the service cannot be held responsible.
              </p>
            </Section>

            <Section
              id="limitation-of-liability"
              icon={Scale}
              title="Limitation of Liability"
            >
              <p>
                To the maximum extent permitted by applicable law, {APP_INFO?.name || "Connecto"}
                shall not be liable for any indirect, incidental, special, consequential,
                or punitive damages.
              </p>

              <p className="mt-3">
                This includes, but is not limited to:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Loss of data or message history</li>
                <li>Loss of access due to device removal or logout</li>
                <li>Service interruptions or delays</li>
                <li>Unauthorized access caused by user negligence</li>
              </ul>

              <p className="mt-3">
                In no event shall our total liability exceed the amount paid by you (if any)
                for use of the service during the twelve months preceding the claim.
              </p>
            </Section>

            <Section
              id="third-party-liability"
              icon={Database}
              title="Third-Party Services & Liability"
            >
              <p>
                Certain features rely on third-party services such as media hosting,
                email delivery, or authentication providers.
              </p>

              <p className="mt-3">
                {APP_INFO?.name || "Connecto"} is not responsible for outages, data loss,
                or security incidents caused by third-party platforms beyond our control.
              </p>

              <p className="mt-3">
                Your use of such services may be subject to separate terms and privacy
                policies.
              </p>
            </Section>

            <Section
              id="governing-law"
              icon={Scale}
              title="Governing Law"
            >
              <p>
                These Terms of Service shall be governed by and interpreted in accordance
                with the laws applicable in the jurisdiction where {APP_INFO?.companyName || "Connecto"}
                is legally established.
              </p>

              <p className="mt-3">
                This governing law applies without regard to conflict-of-law principles.
              </p>
            </Section>

            <Section
              id="dispute-resolution"
              icon={ShieldAlert}
              title="Dispute Resolution"
            >
              <p>
                We encourage you to contact us first to resolve any concerns or disputes
                related to the service.
              </p>

              <p className="mt-3">
                If a dispute cannot be resolved informally, it may be subject to formal
                legal proceedings as permitted by applicable law.
              </p>

              <p className="mt-3">
                You agree that any dispute will be brought in a competent court located
                within the applicable jurisdiction.
              </p>
            </Section>

            <Section
              id="severability"
              icon={FileText}
              title="Severability"
            >
              <p>
                If any provision of these Terms is found to be unlawful, void, or
                unenforceable, that provision shall be deemed severable from the remaining
                Terms.
              </p>

              <p className="mt-3">
                The remaining provisions shall remain in full force and effect.
              </p>
            </Section>

            <Section
              id="no-waiver"
              icon={ShieldAlert}
              title="No Waiver"
            >
              <p>
                Our failure to enforce any right or provision of these Terms shall not
                constitute a waiver of such right or provision.
              </p>

              <p className="mt-3">
                Any waiver must be expressly stated in writing to be legally binding.
              </p>
            </Section>

            <Section
              id="changes-to-terms"
              icon={Clock}
              title="Changes to These Terms"
            >
              <p>
                We may update these Terms of Service from time to time to reflect changes
                in the service, legal requirements, or security practices.
              </p>

              <p className="mt-3">
                When material changes are made, we will update the “Last updated” date and
                notify users through the app or other appropriate means.
              </p>

              <p className="mt-3">
                Continued use of {APP_INFO?.name || "Connecto"} after changes become
                effective constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section
              id="entire-agreement"
              icon={FileText}
              title="Entire Agreement"
            >
              <p>
                These Terms of Service, together with the Privacy Policy, constitute the
                entire agreement between you and {APP_INFO?.name || "Connecto"} regarding
                use of the service.
              </p>

              <p className="mt-3">
                They supersede any prior agreements, understandings, or representations,
                whether written or oral.
              </p>
            </Section>

            <Section
              id="contact"
              icon={Mail}
              title="Contact Information"
            >
              <p>
                If you have questions about these Terms of Service or need legal or account
                assistance, you may contact us using the details below.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  <strong>Legal inquiries:</strong>{" "}
                  <a
                    href={`mailto:${APP_INFO?.legalEmail || "legal@connecto.app"}`}
                    className="text-primary underline"
                  >
                    {APP_INFO?.legalEmail || "legal@connecto.app"}
                  </a>
                </li>
                <li>
                  <strong>Support:</strong>{" "}
                  <a
                    href={`mailto:${APP_INFO?.supportEmail || "support@connecto.app"}`}
                    className="text-primary underline"
                  >
                    {APP_INFO?.supportEmail || "support@connecto.app"}
                  </a>
                </li>
              </ul>
            </Section>

            <Section
              id="final-acknowledgement"
              icon={User}
              title="Final Acknowledgement"
            >
              <p>
                By creating an account or continuing to use {APP_INFO?.name || "Connecto"},
                you acknowledge that you have read, understood, and agreed to these Terms
                of Service.
              </p>

              <p className="mt-3">
                If you do not agree to these Terms, you must discontinue use of the service
                and request account deletion through the app settings.
              </p>
            </Section>

            {/* Footer */}
            <div className="mt-6 pt-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <ConnectoLogo size={56} animated />

                <div>
                  <p className="text-sm font-medium">
                    {APP_INFO?.name || "Connecto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Secure messaging, built with privacy by design.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground max-w-md">
                  End-to-end encryption ensures your messages remain private between you
                  and the people you communicate with. We do not read your messages.
                </p>

                <p className="text-[11px] text-muted-foreground">
                  © {new Date().getFullYear()} {APP_INFO?.companyName || "Connecto"}.
                  All rights reserved.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="space-y-4 py-7 border-b">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted/10 p-2 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}
