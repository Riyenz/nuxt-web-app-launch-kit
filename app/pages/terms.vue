<template>
  <div class="text-default">
    <UContainer
      class="
        pt-12 pb-20
        sm:pt-16
      "
    >
      <div class="mx-auto max-w-3xl">
        <div
          class="
            inline-flex items-center gap-2 rounded-full border border-default
            px-3.5 py-1.5 text-xs font-medium text-primary
          "
        >
          <UIcon
            name="hugeicons:legal-01"
            class="size-3.5"
          />
          Legal
        </div>

        <h1
          class="
            mt-6 text-4xl font-semibold tracking-tight text-highlighted
            sm:text-5xl
          "
        >
          Terms and Conditions
        </h1>
        <p class="mt-4 text-sm text-muted">
          Last updated: [date]
        </p>
        <p class="mt-6 text-base/relaxed text-muted">
          Welcome to {{ site.name }}. These Terms and Conditions ("Terms") are a legal
          agreement between you ("you" or "Customer") and
          <strong class="text-highlighted">
            {{ site.legalEntity }}
          </strong>
          ("{{ site.name }}", "we", "us", or "our"). These Terms govern your access to
          and use of the {{ site.name }} website, applications, APIs, and related
          services (collectively, the "Service"). By creating an account, clicking "I
          agree", or otherwise using the Service, you acknowledge that you have read
          and agree to be bound by these Terms.
        </p>

        <div class="mt-12 flex flex-col gap-10">
          <section
            v-for="section in sections"
            :key="section.title"
            class="scroll-mt-24"
          >
            <h2
              class="
                text-xl font-semibold text-highlighted
                sm:text-2xl
              "
            >
              {{ section.title }}
            </h2>
            <div class="mt-4 flex flex-col gap-4 leading-relaxed text-muted">
              <p
                v-for="(paragraph, index) in section.paragraphs"
                :key="index"
              >
                {{ paragraph }}
              </p>
            </div>
          </section>
        </div>

        <div
          class="
            mt-16 flex flex-col gap-3 rounded-2xl border border-default
            bg-elevated p-6
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <div>
            <p class="text-sm font-semibold text-highlighted">
              Questions about these Terms?
            </p>
            <p class="mt-1 text-sm text-muted">
              Reach out at
              <a
                :href="`mailto:${site.contactEmail}`"
                class="
                  text-primary
                  hover:underline
                "
              >
                {{ site.contactEmail }}
              </a>
              and we'll be happy to help.
            </p>
          </div>
          <UButton
            label="Back to home"
            icon="hugeicons:arrow-left-01"
            color="primary"
            to="/"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { site } from '~~/shared/site'

// Bracketed text is a placeholder a founder replaces before launch; it is not legal advice.
usePageSeo({
  title: 'Terms and Conditions',
  description: `The terms that govern your use of ${site.name}.`,
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Terms and Conditions', path: '/terms' }
  ]
})

type TermsSection = {
  title: string
  paragraphs: string[]
}

const sections: TermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    paragraphs: [
      `By accessing or using ${site.name}, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are using the Service on behalf of a business, organization, or other legal entity, you represent that you have the authority to bind that entity to these Terms, and "you" refers to that entity.`,
      'Your electronic acceptance of these Terms, including by clicking "I agree", checking a consent box, or otherwise using the Service, has the same legal effect as a handwritten signature to the extent [electronic signature law, e.g. the U.S. ESIGN Act or eIDAS] permits.',
      'If you do not agree with any part of these Terms, you must not access or use the Service.'
    ]
  },
  {
    title: '2. Account Registration & Eligibility',
    paragraphs: [
      'To use most features of the Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.',
      `You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately at ${site.contactEmail} of any unauthorized access or suspected compromise of your account.`,
      'You must be at least [minimum age, e.g. 18] years old to create an account. The Service is not directed to children, and we do not knowingly collect personal information from them.'
    ]
  },
  {
    title: '3. Acceptable Use',
    paragraphs: [
      'You agree not to misuse the Service. Prohibited activities include, but are not limited to: violating applicable laws or regulations; infringing intellectual property, privacy, or other rights of third parties; attempting to gain unauthorized access to the Service, its underlying infrastructure, or other users\' accounts; interfering with or disrupting the integrity, security, or performance of the Service; uploading viruses, malware, or other malicious code; and using the Service to send spam or unsolicited communications.',
      'You are solely responsible for ensuring that your use of the Service, including any personal data you collect about other people, complies with all applicable laws, including [data protection law, e.g. the GDPR or the CCPA].',
      'We reserve the right (but are not obligated) to investigate any suspected violation of these Terms. We may take any action we deem appropriate, including issuing warnings, removing content, suspending features, terminating accounts, and cooperating with law enforcement.'
    ]
  },
  {
    title: '4. Subscription, Billing & Trials',
    paragraphs: [
      `${site.name} offers [free and paid plans, or describe your pricing model]. Paid plans are billed on a recurring basis ([billing intervals, e.g. monthly or annually], as selected at checkout) until cancelled. Fees are stated in the currency shown at checkout and are exclusive of applicable taxes ([tax, e.g. VAT or sales tax]), which will be added where required by law.`,
      'By selecting a paid plan, you authorize us and our payment processor, [payment processor, e.g. Stripe], to charge the applicable fees, including renewal fees, to your chosen payment method. Free trials, if offered, will automatically convert to a paid subscription at the end of the trial period unless you cancel before the trial ends.',
      'We may change our fees from time to time. We will provide at least [notice period, e.g. 30 days] of advance notice of any fee increase, and the new fees will take effect at your next renewal. If you do not agree to the new fees, you may cancel before they take effect.',
      'Plans offered at no charge are provided for as long as we choose to offer them. We may change the features, limits, or price of a free plan, or discontinue it, on at least [notice period, e.g. 30 days] of notice.',
      '[Refund policy, e.g. All fees are non-refundable except where required by law.] You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the then-current billing period, and you will retain access to paid features until that period ends.',
      'If a payment is overdue, we may suspend access to paid features after providing reasonable notice. Continued non-payment may result in termination of your account in accordance with Section 7.'
    ]
  },
  {
    title: '5. Customer Data, Privacy & Data Protection',
    paragraphs: [
      `You retain all rights to the data you and your authorized users submit to the Service, including personal data of other individuals ("Customer Data"). You grant ${site.name} a worldwide, non-exclusive, royalty-free license to host, process, transmit, store, back up, display, and otherwise use Customer Data solely as necessary to provide, secure, and improve the Service and to comply with legal obligations.`,
      `For the purposes of [data protection law, e.g. the GDPR], you are the controller of Customer Data and ${site.name} acts as your processor. We will process Customer Data only as necessary to provide the Service and in accordance with these Terms, our Privacy Policy, and applicable law. We maintain reasonable and appropriate organizational and technical security measures to protect Customer Data, and will notify you without undue delay, and in any case within [breach notice window, e.g. 72 hours], after becoming aware of a personal data breach affecting Customer Data, so that you can meet your own notification obligations.`,
      'You are responsible for: (a) obtaining all necessary consents and providing all required notices to the individuals whose data you submit; (b) having a lawful basis for collecting and processing personal data through the Service; and (c) responding to data subject requests and complying with all applicable data protection laws.',
      'Customer Data may be hosted and processed by our sub-processors (including cloud, database, and authentication providers) in [sub-processor locations, e.g. the United States and the European Union]. Where Customer Data is transferred across borders, we apply safeguards that [data protection law, e.g. the GDPR] requires, such as [transfer mechanism, e.g. standard contractual clauses].',
      'Our handling of personal data we collect directly from you, for example when you sign up or contact us, is described in our Privacy Policy, which forms part of these Terms.'
    ]
  },
  {
    title: '6. Intellectual Property',
    paragraphs: [
      `The Service, including its software, design, text, graphics, branding, and all related intellectual property, is owned by ${site.name} or its licensors and is protected by intellectual property laws. Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Service for your internal business purposes.`,
      'You may not copy, modify, distribute, sell, lease, sublicense, reverse engineer, decompile, disassemble, or create derivative works of the Service, except to the extent such restriction is prohibited by applicable law.',
      'The Service incorporates third-party and open-source software components, which remain subject to their respective licenses. Nothing in these Terms limits your rights under those licenses.',
      `If you provide us with feedback, suggestions, or ideas about the Service, you grant ${site.name} a perpetual, irrevocable, worldwide, royalty-free license to use and incorporate them into the Service without obligation or compensation to you.`
    ]
  },
  {
    title: '7. Termination & Suspension',
    paragraphs: [
      `You may cancel a paid subscription at any time through your account settings. To close your account entirely, follow the steps on our Support page or contact us at ${site.contactEmail}. We may suspend or terminate your access to the Service, in whole or in part, with reasonable notice if you breach these Terms, and immediately and without prior notice if (a) we reasonably believe such action is necessary to protect the Service, our users, or third parties, (b) required by law or regulatory authority, or (c) your account remains unpaid past its due date.`,
      `Upon termination, your right to use the Service will cease. We keep Customer Data for [retention period after termination] after termination, and then delete it. You may ask us at ${site.contactEmail} to delete Customer Data sooner. We keep Customer Data longer only where the law requires it or to resolve disputes and enforce our agreements.`,
      'Sections that by their nature should survive termination (including Sections 5, 6, 8, 9, 10, and 12 through 16) will survive.'
    ]
  },
  {
    title: '8. Disclaimers',
    paragraphs: [
      'Except as expressly stated in these Terms and to the maximum extent permitted by applicable mandatory law, the Service is provided "as is" and "as available", without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, title, and non-infringement.',
      'We do not warrant that the Service will be uninterrupted, error-free, completely secure, or that defects will be corrected. You are responsible for verifying the accuracy of any data or output generated through the Service before relying on it for legal, financial, or employment decisions.'
    ]
  },
  {
    title: '9. Limitation of Liability',
    paragraphs: [
      `To the maximum extent permitted by law, ${site.name} and its affiliates, officers, directors, employees, and licensors will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, business opportunity, data, or goodwill, arising out of or in connection with these Terms or your use of the Service, even if we have been advised of the possibility of such damages.`,
      'Our aggregate liability for any and all claims arising out of or relating to these Terms or the Service will not exceed [liability cap, e.g. the greater of the fees you paid us in the twelve (12) months before the event giving rise to the claim and a fixed amount].',
      'Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable mandatory law, including liability for gross negligence, fraud, willful misconduct, death, or personal injury caused by negligence.'
    ]
  },
  {
    title: '10. Indemnification',
    paragraphs: [
      `You agree to defend, indemnify, and hold harmless ${site.name} and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with: (a) your Customer Data; (b) your use of the Service in violation of these Terms or applicable law; (c) your violation of any third-party right, including any intellectual property or privacy right; and (d) any dispute between you and the individuals whose data you submit to the Service.`,
      `We will promptly notify you of any claim subject to indemnification and reasonably cooperate with your defense, at your expense. You will not settle any claim that imposes any obligation or liability on ${site.name} without our prior written consent.`
    ]
  },
  {
    title: '11. Force Majeure',
    paragraphs: [
      'Neither party will be liable for any failure or delay in performance under these Terms (other than payment obligations) to the extent caused by events beyond its reasonable control, including acts of God, natural disasters, fire, flood, pandemic or epidemic, war, terrorism, civil unrest, government action, labor disputes, internet or telecommunications outages, and failures of third-party cloud or infrastructure providers.'
    ]
  },
  {
    title: '12. Changes to the Terms and the Service',
    paragraphs: [
      'We may update these Terms from time to time. When we make material changes, we will provide at least [notice period, e.g. 30 days] of advance notice before the changes take effect, by posting the updated Terms on this page, updating the "Last updated" date above, and (where appropriate) notifying you by email or through the Service.',
      'If you do not agree to the updated Terms, you may terminate your account before the changes take effect. Your continued use of the Service after the effective date constitutes your acceptance of the updated Terms.',
      'The Service is delivered as software that we improve continuously. We may add, change, or remove features and functionality at any time. We may also correct defects, adjust how a feature works, and make changes required for security, performance, or legal compliance without prior notice.',
      'Features described as beta, preview, early access, or experimental are provided for evaluation and may be changed or withdrawn at any time without notice.'
    ]
  },
  {
    title: '13. Governing Law & Dispute Resolution',
    paragraphs: [
      'These Terms are governed by and construed in accordance with [governing law, e.g. the laws of the State of Delaware], without regard to its conflict of laws principles.',
      'The parties will attempt in good faith to resolve any dispute arising out of or relating to these Terms through informal negotiation. If the dispute cannot be resolved within [negotiation period, e.g. 60 days], it will be brought exclusively before [courts or arbitration venue, e.g. the state and federal courts located in Wilmington, Delaware], and the parties consent to the personal jurisdiction of those courts.',
      'Nothing in this Section prevents either party from seeking injunctive or equitable relief in any court of competent jurisdiction to protect its intellectual property, confidential information, or data.'
    ]
  },
  {
    title: '14. Assignment',
    paragraphs: [
      'You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent, and any attempted assignment without such consent is void. We may assign these Terms in connection with a merger, acquisition, reorganization, or sale of all or substantially all of our assets, or to any affiliate, in each case upon notice to you.'
    ]
  },
  {
    title: '15. Entire Agreement; Order of Precedence',
    paragraphs: [
      `These Terms, together with our Privacy Policy and any order forms or written agreements signed by both parties, constitute the entire agreement between you and ${site.name} regarding the Service and supersede all prior or contemporaneous communications and proposals.`,
      'In the event of a conflict, the following order of precedence applies: (1) any signed order form or written agreement between the parties; (2) these Terms; and (3) the Privacy Policy.'
    ]
  },
  {
    title: '16. Miscellaneous',
    paragraphs: [
      'No Waiver. Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.',
      'Severability. If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.',
      'No Third-Party Beneficiaries. These Terms do not create any third-party beneficiary rights.',
      `Notices. We may provide notices to you by email or through the Service. You may provide notices to us at ${site.contactEmail}.`,
      'Relationship. The parties are independent contractors, and these Terms do not create any agency, partnership, joint venture, or employment relationship.'
    ]
  },
  {
    title: '17. Contact',
    paragraphs: [
      `If you have any questions about these Terms or the Service, please contact us at ${site.contactEmail}. We typically respond within a few business days.`
    ]
  }
]
</script>
