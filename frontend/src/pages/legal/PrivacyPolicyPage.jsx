// PART 1 — Privacy Policy Page (Expanded)
// Uses ConnectoLogo, user-facing language only, no URL hash changes
// Further parts will extend sections, animations, accessibility, and layout

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Database, Smartphone, Key, Clock, UserCheck, Mail, List, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_INFO } from "@/constants";
import ConnectoLogo from "@/components/common/ConnectoLogo";

// NOTE:
// This file is intentionally verbose and structured for clarity.
// It is user-facing only. No backend/internal implementation details are exposed.

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = React.useState(null);

  const toggleGroup = (id) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };
  const sections = [
    {
      id: "overview-group",
      title: "Overview",
      icon: Shield,
      children: [
        { id: "summary", title: "Overview" },
        { id: "collection", title: "Information We Collect" },
        { id: "encryption", title: "End-to-End Encryption" },
      ],
    },
    {
      id: "auth-group",
      title: "Authentication & Devices",
      icon: Smartphone,
      children: [
        { id: "auth", title: "Authentication & Account Access" },
        { id: "sessions", title: "Sessions & Login Security" },
        { id: "devices", title: "Devices Linked to Your Account" },
        { id: "encryption-keys", title: "Device Encryption & Key Handling" },
        { id: "lost-device", title: "Lost or Compromised Devices" },
      ],
    },
    {
      id: "messages-group",
      title: "Messages & Conversations",
      icon: Database,
      children: [
        { id: "messages", title: "Messages & Conversations" },
        { id: "attachments", title: "Attachments & Media Sharing" },
        { id: "editing", title: "Editing Messages" },
        { id: "deletion", title: "Deleting Messages" },
        { id: "read-receipts", title: "Read Receipts" },
        { id: "clearing-chat", title: "Clearing Conversations" },
        { id: "sync", title: "Multi-Device Synchronization" },
      ],
    },
    {
      id: "legal-group",
      title: "Legal & Policies",
      icon: Globe,
      children: [
        { id: "third-party", title: "Third-Party Services" },
        { id: "data-sharing", title: "How We Share Data" },
        { id: "law-enforcement", title: "Law Enforcement & Legal Requests" },
        { id: "international", title: "International Data Transfers" },
        { id: "data-retention", title: "Data Retention" },
        { id: "account-deletion", title: "Account Deletion" },
        { id: "policy-changes", title: "Changes to This Policy" },
        { id: "contact-support", title: "Contact & Support" },
      ],
    },
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
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="flex items-center gap-4">
            <ConnectoLogo size={42} />
            <div>
              <h1 className="text-xl font-semibold">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Last updated: February 10, 2026</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* TOC */}
          <aside className="lg:col-span-1">
            <div
              className="
      sticky top-6
      border rounded-xl bg-card
      p-4
      max-h-[calc(100vh-3rem)]
      overflow-hidden
    "
            >
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">Contents</span>
              </div>

              {/* Scrollable list */}
              <nav className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-6rem)]">
                {sections.map((group) => {
                  const Icon = group.icon;
                  const isOpen = openGroup === group.id;

                  return (
                    <div key={group.id} className="rounded-md border bg-muted/10">
                      {/* Parent button */}
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary/80" />
                          {group.title}
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      {/* Children */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="flex flex-col">
                          {group.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => scrollTo(child.id)}
                              className="text-left px-6 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                            >
                              {child.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>


          {/* MAIN CONTENT */}
          <main className="lg:col-span-3">

            <Section id="summary" icon={Shield} title="Overview">
              <p>
                {APP_INFO?.name || "Connecto"} is designed around privacy-by-default principles.
                We collect only the information required to provide secure, real-time communication
                across your devices.
              </p>
              <p className="mt-4">
                Messages are protected using end-to-end encryption. This means message content is
                encrypted on your device before being sent and can only be decrypted by the
                intended recipients.
              </p>
            </Section>

            <Section id="collection" icon={Database} title="Information We Collect">
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address for account creation and login</li>
                <li>Optional profile details such as username and avatar</li>
                <li>Device identifiers to manage multi-device access</li>
                <li>Encrypted message data and delivery metadata</li>
              </ul>
            </Section>

            <Section id="encryption" icon={Key} title="End-to-End Encryption">
              <p>
                Encryption keys are generated and stored on your devices. The service does not
                have access to private keys and cannot read your messages.
              </p>
              <p className="mt-4">
                While message content is encrypted, limited metadata such as timestamps,
                sender and recipient identifiers, and device information is required for
                message delivery and synchronization.
              </p>
            </Section>

            <Section id="auth" icon={Key} title="Authentication & Account Access">
              <p>
                {APP_INFO?.name || "Connecto"} uses secure authentication methods to ensure
                only you can access your account. We do not use passwords that can be reused
                or guessed.
              </p>

              <h4 className="font-medium mt-4">Email verification</h4>
              <p className="mt-1">
                When signing in with email, we send a one-time verification code (OTP) to your
                email address. This code is valid for a short time and can only be used once.
                This helps prevent unauthorized access.
              </p>

              <h4 className="font-medium mt-4">Google sign-in</h4>
              <p className="mt-1">
                You may also sign in using your Google account. In this case, we receive your
                verified email address and a unique Google identifier. We never receive your
                Google password.
              </p>

              <p className="mt-3">
                Regardless of the method you choose, every login is tied to a specific device
                for additional security.
              </p>
            </Section>

            <Section id="sessions" icon={Clock} title="Sessions & Login Security">
              <p>
                Each time you sign in, a secure session is created for your device. This
                allows you to stay logged in without repeatedly verifying your identity,
                while still keeping your account protected.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  Sessions automatically expire after a limited period of inactivity.
                </li>
                <li>
                  You can be logged in on multiple devices at the same time.
                </li>
                <li>
                  Each device has its own independent session.
                </li>
              </ul>

              <p className="mt-3">
                If you log out, the session for that device is immediately revoked and can no
                longer be used.
              </p>
            </Section>

            <Section id="devices" icon={Smartphone} title="Devices Linked to Your Account">
              <p>
                Every device you use with {APP_INFO?.name || "Connecto"} is registered to your
                account. This allows you to see where your account is active and maintain
                control over access.
              </p>

              <h4 className="font-medium mt-4">What we show you</h4>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Device name (for example: phone or browser)</li>
                <li>Last active time</li>
                <li>Whether the device is currently signed in</li>
              </ul>

              <h4 className="font-medium mt-4">Managing devices</h4>
              <p className="mt-1">
                From your settings, you can log out any individual device. This is useful if
                you lose a phone, change computers, or notice unfamiliar activity.
              </p>

              <p className="mt-3">
                Once a device is logged out or removed, it cannot receive new messages or
                access your account unless you sign in again from that device.
              </p>
            </Section>

            <Section id="encryption-keys" icon={Shield} title="Device Encryption & Key Handling">
              <p>
                To protect your messages, encryption keys are generated and stored on each
                of your devices. These keys are used to encrypt and decrypt messages locally
                on your device.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  Private encryption keys are generated on your device.
                  An encrypted backup of your private key may be stored securely on our servers
                  to allow identity restoration on new devices.

                  This backup is encrypted before leaving your device and cannot be accessed
                  without your authentication credentials.
                </li>
                <li>
                  The server only stores encrypted message data.
                </li>
                <li>
                  Adding a new device requires secure key exchange.
                </li>
              </ul>

              <p className="mt-3">
                If a device is removed, it will no longer be able to decrypt future messages.
                Previously received messages remain accessible only on devices that already
                had access.
              </p>
            </Section>

            <Section id="lost-device" icon={UserCheck} title="Lost or Compromised Devices">
              <p>
                If you believe a device linked to your account has been lost, stolen, or
                compromised, you should remove it immediately from your device list.
              </p>

              <p className="mt-3">
                Removing a device:
              </p>

              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Ends all active sessions for that device</li>
                <li>Prevents it from receiving new messages</li>
                <li>Protects your account from further access</li>
              </ul>

              <p className="mt-3">
                We recommend enabling device lock features (PIN, fingerprint, or face
                authentication) on your operating system for additional protection.
              </p>
            </Section>

            <Section id="messages" icon={Database} title="Messages & Conversations">
              <p>
                {APP_INFO?.name || "Connecto"} is designed so that only participants in a
                conversation can access its messages. Messages are delivered securely and
                synchronized across your devices.
              </p>

              <h4 className="font-medium mt-4">Message delivery</h4>
              <p className="mt-1">
                When you send a message, it is delivered to each participant individually.
                Messages may appear as sent, delivered, or read depending on the recipient’s
                activity and connection status.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Sent: the message left your device successfully.</li>
                <li>Delivered: the message reached the recipient’s device.</li>
                <li>Read: the recipient has opened the conversation.</li>
              </ul>

              <p className="mt-3">
                These indicators help you understand message status but do not reveal
                additional personal information.
              </p>
            </Section>

            <Section id="attachments" icon={Database} title="Attachments & Media Sharing">
              <p>
                You can share images, videos, audio, and documents within conversations.
                Attachments are uploaded securely and linked to the message that sent them.
              </p>

              <h4 className="font-medium mt-4">What we store</h4>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>The attachment file required to display or download it</li>
                <li>Basic file details such as type and size</li>
                <li>The time the attachment was sent</li>
              </ul>

              <p className="mt-3">
                Attachments are only accessible to members of the conversation where they
                were shared.
              </p>

              <h4 className="font-medium mt-4">Removing attachments</h4>
              <p className="mt-1">
                When a message containing an attachment is deleted for everyone, the
                attachment is also removed and can no longer be accessed.
              </p>
            </Section>

            <Section id="editing" icon={Clock} title="Editing Messages">
              <p>
                You can edit messages you have sent to correct mistakes or clarify meaning.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Only the sender can edit their own messages.</li>
                <li>Edited messages are marked as edited.</li>
                <li>Recipients will see the updated message content.</li>
              </ul>

              <p className="mt-3">
                Previous versions of a message are not shown to other users.
              </p>
            </Section>

            <Section id="deletion" icon={Shield} title="Deleting Messages">
              <p>
                {APP_INFO?.name || "Connecto"} gives you control over how messages are
                removed.
              </p>

              <h4 className="font-medium mt-4">Delete for everyone</h4>
              <p className="mt-1">
                When you delete a message for everyone, it is removed from the conversation
                for all participants. This also removes any attached files.
              </p>

              <h4 className="font-medium mt-4">Delete for me</h4>
              <p className="mt-1">
                When you delete a message only for yourself, it is hidden from your view but
                remains visible to other participants.
              </p>

              <p className="mt-3">
                Once a message is deleted for everyone, it cannot be recovered.
              </p>
            </Section>

            <Section id="read-receipts" icon={UserCheck} title="Read Receipts & Activity Indicators">
              <p>
                Read receipts help you understand when messages are seen by others.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  Read receipts are shown only to participants of the conversation.
                </li>
                <li>
                  Read status is based on when a conversation is opened, not when a message
                  is merely delivered.
                </li>
                <li>
                  Read receipts are synchronized across your devices.
                </li>
              </ul>
            </Section>

            <Section id="clearing-chat" icon={Shield} title="Clearing Conversations">
              <p>
                You may clear a conversation from your view at any time.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  Clearing a chat removes it from your device only.
                </li>
                <li>
                  Other participants continue to see the conversation normally.
                </li>
                <li>
                  Clearing a chat does not notify other users.
                </li>
              </ul>
            </Section>

            <Section id="sync" icon={Smartphone} title="Multi-Device Synchronization">
              <p>
                Messages are synchronized across all devices linked to your account.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  Messages sent from one device appear on your other active devices.
                </li>
                <li>
                  Read status and deletions are kept in sync.
                </li>
                <li>
                  Removing a device stops synchronization for that device.
                </li>
              </ul>
            </Section>

            <Section id="blocking" icon={Shield} title="Blocking Users & Conversations">
              <p>
                {APP_INFO?.name || "Connecto"} gives you full control over who can interact
                with you. Blocking tools are designed to prevent unwanted communication
                while keeping your data private.
              </p>

              <h4 className="font-medium mt-4">Blocking a user</h4>
              <p className="mt-1">
                When you block a user:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>They can no longer send you messages or call you.</li>
                <li>You will no longer receive messages from them.</li>
                <li>Existing conversations remain visible but inactive.</li>
              </ul>

              <p className="mt-3">
                Blocking is mutual in effect — once blocked, communication is stopped in
                both directions.
              </p>

              <h4 className="font-medium mt-4">Blocking a conversation</h4>
              <p className="mt-1">
                You may block a specific conversation (such as a group chat). When blocked:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>You will not receive new messages from that conversation.</li>
                <li>You can unblock the conversation at any time.</li>
                <li>Other members are not notified when you block a chat.</li>
              </ul>
            </Section>

            <Section id="privacy-controls" icon={UserCheck} title="Privacy Controls">
              <p>
                Your privacy settings allow you to manage what others can see about you.
              </p>

              <h4 className="font-medium mt-4">Profile visibility</h4>
              <p className="mt-1">
                Other users may see your username, profile picture, and online status when
                they are allowed to interact with you.
              </p>

              <p className="mt-3">
                Users you block cannot view updates to your profile or contact you.
              </p>

              <h4 className="font-medium mt-4">Contact discovery</h4>
              <p className="mt-1">
                Users can find you using your unique username. Your email address is never
                publicly visible or searchable.
              </p>
            </Section>

            <Section id="online-status" icon={Clock} title="Online Status & Last Seen">
              <p>
                {APP_INFO?.name || "Connecto"} shows online activity indicators to help users
                understand availability.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  <strong>Online</strong>: shown when you are actively connected.
                </li>
                <li>
                  <strong>Last seen</strong>: shown when you are offline.
                </li>
              </ul>

              <p className="mt-3">
                Online status updates automatically when you connect or disconnect from the
                service. Blocked users do not see your online status.
              </p>
            </Section>

            <Section id="typing-indicators" icon={Smartphone} title="Typing Indicators">
              <p>
                Typing indicators show when another participant is actively composing a
                message.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Typing indicators are visible only within the same conversation.</li>
                <li>No message content is shared during typing.</li>
                <li>Typing status disappears automatically after inactivity.</li>
              </ul>

              <p className="mt-3">
                These indicators are used only to improve conversation flow and do not store
                message data.
              </p>
            </Section>

            <Section id="calls-safety" icon={Shield} title="Calls & Safety">
              <p>
                Audio and video calls are available between allowed participants.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>You can only call users who are allowed to message you.</li>
                <li>Blocked users cannot initiate or receive calls.</li>
                <li>Call history shows basic information such as time and duration.</li>
              </ul>

              <p className="mt-3">
                Call media is transmitted in real time and is not stored by the service.
              </p>
            </Section>

            <Section id="abuse" icon={Mail} title="Abuse, Misuse & Reporting">
              <p>
                We take misuse of the platform seriously.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  You may block users engaging in harassment or abuse.
                </li>
                <li>
                  You may contact support to report violations of platform rules.
                </li>
                <li>
                  We may take action against accounts that violate our policies.
                </li>
              </ul>

              <p className="mt-3">
                Reports are reviewed manually and handled confidentially.
              </p>
            </Section>

            <Section id="third-party" icon={Database} title="Third-Party Services">
              <p>
                {APP_INFO?.name || "Connecto"} uses a limited number of trusted third-party
                services to operate core features. These services are used only where
                necessary and only receive the minimum information required.
              </p>

              <h4 className="font-medium mt-4">Media & file storage</h4>
              <p className="mt-1">
                Images, videos, audio files, and documents you upload are stored securely
                using a media hosting provider. This allows fast delivery and reliable
                downloads across devices.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Only files you choose to upload are sent to this service.</li>
                <li>Deleted files are removed when you delete messages or media.</li>
                <li>Media is linked only to your conversations.</li>
              </ul>

              <h4 className="font-medium mt-4">Email delivery</h4>
              <p className="mt-1">
                Email services are used to send one-time passcodes (OTPs) and important
                account-related messages.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Your email address is used only for authentication and support.</li>
                <li>We do not send promotional emails without your consent.</li>
              </ul>

              <h4 className="font-medium mt-4">Sign-in with Google</h4>
              <p className="mt-1">
                If you choose to sign in using Google, we receive basic account information
                such as your email address and a unique identifier from Google.
              </p>

              <p className="mt-3">
                We do not receive access to your Google password or private Google data.
              </p>
            </Section>

            <Section id="data-sharing" icon={Shield} title="How We Share Data">
              <p>
                Your data is not sold, rented, or shared for advertising purposes.
              </p>

              <p className="mt-3">
                We share limited information only in the following situations:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  <strong>With service providers</strong> — to deliver features such as file
                  uploads, email verification, and real-time communication.
                </li>
                <li>
                  <strong>For legal reasons</strong> — when required to comply with
                  applicable laws, court orders, or valid legal requests.
                </li>
                <li>
                  <strong>For safety</strong> — to prevent fraud, abuse, or harm to users.
                </li>
              </ul>

              <p className="mt-3">
                Any data shared is limited to what is legally required or technically
                necessary.
              </p>
            </Section>

            <Section id="law-enforcement" icon={Key} title="Law Enforcement & Legal Requests">
              <p>
                We respect user privacy while complying with applicable laws.
              </p>

              <p className="mt-3">
                If we receive a valid legal request, we may be required to provide:
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Basic account information (such as email address)</li>
                <li>Message metadata (timestamps, sender and recipient identifiers)</li>
                <li>Stored encrypted message data</li>
              </ul>

              <p className="mt-3">
                Message content is end-to-end encrypted. We cannot read message content and
                cannot provide readable message text.
              </p>

              <p className="mt-3">
                Where permitted by law, we will attempt to notify users about legal requests
                that affect their data.
              </p>
            </Section>

            <Section id="international" icon={Globe} title="International Data Transfers">
              <p>
                Your data may be processed or stored in different regions depending on where
                our infrastructure and service providers operate.
              </p>

              <p className="mt-3">
                We take reasonable steps to ensure that your data is protected regardless of
                location and handled in accordance with this Privacy Policy.
              </p>
            </Section>

            <Section id="no-ads" icon={Shield} title="No Advertising or Tracking">
              <p>
                {APP_INFO?.name || "Connecto"} does not show ads and does not track users for
                advertising purposes.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>No third-party ad trackers</li>
                <li>No selling of personal data</li>
                <li>No behavioral profiling for ads</li>
              </ul>
            </Section>

            <Section id="data-retention" icon={Clock} title="Data Retention">
              <p>
                {APP_INFO?.name || "Connecto"} keeps data only for as long as it is needed to
                provide the service and maintain account security.
              </p>

              <h4 className="font-medium mt-4">Messages</h4>
              <p className="mt-1">
                Messages are stored until you delete them or delete your account. Deleted
                messages are removed according to your actions and are no longer visible to
                other users where applicable.
              </p>

              <h4 className="font-medium mt-4">Media & attachments</h4>
              <p className="mt-1">
                Media files are stored only while they are referenced by messages. When a
                message is deleted, associated media is removed within a reasonable time.
              </p>

              <h4 className="font-medium mt-4">Account & session data</h4>
              <p className="mt-1">
                Authentication data, sessions, and device records are retained only while
                your account is active or required for security and fraud prevention.
              </p>

              <p className="mt-3">
                Some limited information may be retained for legal or operational reasons,
                such as abuse prevention or compliance with applicable laws.
              </p>
            </Section>

            <Section id="account-deletion" icon={UserCheck} title="Account Deletion">
              <p>
                You can request deletion of your account at any time from the app settings.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Your account will be deactivated and scheduled for deletion.
                  Certain limited records may be retained for security, fraud prevention,
                  or legal compliance purposes.
                </li>
                <li>Your active sessions and devices will be logged out.</li>
                <li>You will no longer be able to sign in.</li>
              </ul>

              <p className="mt-3">
                Messages you have sent may remain visible in conversations for other users
                but will no longer be associated with your active account.
              </p>

              <p className="mt-3">
                Once account deletion is completed, it cannot be undone.
              </p>
            </Section>

            <Section id="your-rights" icon={Shield} title="Your Privacy Rights">
              <p>
                Depending on your location, you may have rights under privacy laws such as
                the right to access, correct, or delete your personal information.
              </p>

              <h4 className="font-medium mt-4">Your rights may include</h4>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Accessing your account information</li>
                <li>Correcting inaccurate profile details</li>
                <li>Requesting deletion of your account</li>
                <li>Objecting to certain data processing</li>
              </ul>

              <p className="mt-3">
                Requests can be made through in-app settings or by contacting support.
              </p>
            </Section>

            <Section id="data-export" icon={Database} title="Data Access & Export">
              <p>
                You may request a copy of your account data where required by law.
              </p>

              <p className="mt-3">
                Exported data may include profile information and basic account details.
                Encrypted messages may be included only in their encrypted form.
              </p>
            </Section>

            <Section id="policy-changes" icon={Clock} title="Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time.
              </p>

              <p className="mt-3">
                When we make material changes, we will update the “Last updated” date and
                notify users through the app or other appropriate channels.
              </p>

              <p className="mt-3">
                Continued use of the service after changes means you accept the updated
                policy.
              </p>
            </Section>


            <Section id="contact-support" icon={Mail} title="Contact & Support">
              <p>
                If you have questions about this Privacy Policy, your data, or how the
                service works, you can contact us using the details below.
              </p>

              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>
                  <strong>Support:</strong>{" "}
                  <a
                    href={`mailto:${APP_INFO?.supportEmail || "support@connecto.app"}`}
                    className="text-primary underline"
                  >
                    {APP_INFO?.supportEmail || "support@connecto.app"}
                  </a>
                </li>
                <li>
                  <strong>Privacy requests:</strong>{" "}
                  <a
                    href={`mailto:${APP_INFO?.privacyEmail || "privacy@connecto.app"}`}
                    className="text-primary underline"
                  >
                    {APP_INFO?.privacyEmail || "privacy@connecto.app"}
                  </a>
                </li>
              </ul>

              <p className="mt-4">
                For security-related issues, please contact us as soon as possible so we
                can take appropriate action.
              </p>
            </Section>

            <Section id="consent" icon={UserCheck} title="Your Consent">
              <p>
                By creating an account or using {APP_INFO?.name || "Connecto"}, you agree
                to this Privacy Policy and the way we handle your data as described above.
              </p>

              <p className="mt-3">
                If you do not agree with this policy, please discontinue use of the service
                and request account deletion through the app settings.
              </p>
            </Section>

            {/* ================= Footer ================= */}

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
