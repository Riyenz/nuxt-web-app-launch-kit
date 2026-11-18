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
            name="hugeicons:shield-01"
            class="size-3.5"
          />
          Privacy
        </div>

        <h1
          class="
            mt-6 text-4xl font-semibold tracking-tight text-highlighted
            sm:text-5xl
          "
        >
          Privacy Policy
        </h1>
        <p class="mt-4 text-sm text-muted">
          Last updated: [date]
        </p>
        <p class="mt-6 text-base/relaxed text-muted">
          All references to "we", "us", "our", or "{{ site.name }}" refer to
          <strong class="text-highlighted">{{ site.legalEntity }}</strong>, the
          operator of the {{ site.name }} website, applications, and related services
          (collectively, the "Service"). All references to "you" or "your" refer to
          the person or entity who registered for a {{ site.name }} account or who uses
          or accesses the Service.
        </p>
        <p class="mt-4 text-base/relaxed text-muted">
          {{ site.name }} is committed to protecting the privacy of our users in
          accordance with [data protection law, e.g. the GDPR and the CCPA] and other
          applicable laws. This Privacy Policy describes how we collect, use,
          disclose, store, and protect your personal information.
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
              <template
                v-for="(block, index) in section.blocks"
                :key="index"
              >
                <h3
                  v-if="block.heading"
                  class="text-base font-semibold text-highlighted"
                >
                  {{ block.heading }}
                </h3>
                <p>
                  {{ block.text }}
                </p>
              </template>
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
              Privacy questions or requests
            </p>
            <p class="mt-1 text-sm text-muted">
              Email
              <a
                :href="`mailto:${site.contactEmail}`"
                class="
                  text-primary
                  hover:underline
                "
              >
                {{ site.contactEmail }}
              </a>
              for privacy questions or to exercise your rights.
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
  title: 'Privacy Policy',
  description: `How ${site.name} collects, uses, and protects your personal information.`,
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Privacy Policy', path: '/privacy' }
  ]
})

type PrivacyBlock = {
  heading?: string
  text: string
}

type PrivacySection = {
  title: string
  blocks: PrivacyBlock[]
}

const sections: PrivacySection[] = [
  {
    title: '1. Applicability',
    blocks: [
      {
        text: `This Privacy Policy applies to all personal information that ${site.name} collects, processes, and stores in connection with your use of the Service. It applies to account holders, authorized users invited by an account holder, and visitors to our website.`
      },
      {
        text: `When you use the Service to process personal information about other individuals, you act as the controller and ${site.name} acts as your processor. This Privacy Policy primarily describes how we handle personal information for which ${site.name} is the controller. The processing of personal information that you upload to the Service is further governed by our Terms and Conditions.`
      },
      {
        text: 'The Service is not directed to individuals under [minimum age, e.g. 18] years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so that we can take appropriate action.'
      }
    ]
  },
  {
    title: '2. Personal Information We Collect',
    blocks: [
      {
        text: 'We collect personal information that you provide directly to us, that we generate or infer through your use of the Service, and that we receive from third parties, such as our authentication and payment providers.'
      },
      {
        heading: '2.1 Account Information',
        text: 'When you register for or are invited to an account, we collect your name, email address, and your account credentials. Account credentials are managed through our authentication provider and are stored in hashed form. We do not have access to your plain-text password.'
      },
      {
        heading: '2.2 Content You Submit',
        text: 'We process the data you and your authorized users submit to the Service, such as [describe the main kinds of data your product stores]. We use it only to provide the Service as described in this Privacy Policy and our Terms and Conditions.'
      },
      {
        heading: '2.3 Billing Information',
        text: 'For paid plans, our payment processor, [payment processor, e.g. Stripe], collects your billing name, address, tax identification number where applicable, and card details at checkout. We receive your email address, your plan, and the payment records the processor sends us. We never receive or store full card numbers.'
      },
      {
        heading: '2.4 Automatically Collected Information',
        text: 'When you access the Service, we automatically collect information about your device, browser, and use of the Service, including IP address, device identifiers, browser type and version, operating system, referring and exit pages, pages visited, features used, time zone, and approximate location derived from IP address. We use this information to operate, secure, analyze, and improve the Service.'
      },
      {
        heading: '2.5 Communications',
        text: 'When you contact us for support, feedback, or other inquiries, we collect the content of your communications and any information you choose to provide, together with our responses.'
      }
    ]
  },
  {
    title: '3. Lawful Collection, Use, and Processing of Personal Information',
    blocks: [
      {
        text: `We collect, use, and process personal information only on lawful bases recognized under [data protection law, e.g. the GDPR], including: (a) your consent; (b) the necessity of the processing to fulfill our contract with you, including the provision of the Service; (c) compliance with a legal obligation to which ${site.name} is subject; (d) the protection of vitally important interests; or (e) the legitimate interests pursued by ${site.name} or by a third party, except where such interests are overridden by your fundamental rights and freedoms.`
      },
      {
        text: 'We use personal information to: (i) provide, operate, secure, and improve the Service; (ii) create, authenticate, and manage your account; (iii) process payments and send billing communications; (iv) provide customer support and respond to inquiries; (v) send service notices, security alerts, and administrative messages; (vi) with your consent where required, send marketing communications about our products and offerings; (vii) detect, prevent, and respond to fraud, abuse, and security incidents; (viii) conduct analytics, research, and product development; and (ix) comply with legal obligations and enforce our agreements.'
      },
      {
        text: 'We will not use your personal information for purposes that are incompatible with those described above without first obtaining your consent or otherwise providing notice as required by law.'
      }
    ]
  },
  {
    title: '4. Data Security and Retention',
    blocks: [
      {
        text: `${site.name} implements reasonable and appropriate organizational and technical security measures to protect personal information against accidental or unlawful destruction, alteration, unauthorized disclosure, or any other unlawful processing.`
      },
      {
        text: 'These measures include role-based access controls, the principle of least privilege, encryption of personal information in transit, secure software development practices, audit logging, regular backups, and a documented incident response plan. Personnel with access to personal information are bound by confidentiality obligations.'
      },
      {
        text: `If a personal data breach affects information we process on behalf of a customer, we tell that customer within [breach notice window for customers, e.g. 24 hours] of confirming it, so the customer can meet its own notification duties. If a breach affects information for which ${site.name} is the controller, we notify [regulator, e.g. the relevant data protection authority] and the affected people within [breach notice window for regulators, e.g. 72 hours] where the law requires it.`
      },
      {
        text: `We keep account information and your content while your account is open. When an account closes, we keep its records for [retention period] and then delete them. To have records deleted sooner, email ${site.contactEmail}. We keep information longer only where the law requires it or for the establishment, exercise, or defense of legal claims.`
      },
      {
        text: 'No method of transmission over the internet or method of electronic storage is completely secure. While we work hard to protect your personal information, we cannot guarantee its absolute security.'
      }
    ]
  },
  {
    title: '5. Cookies and Similar Technologies',
    blocks: [
      {
        text: 'We and our service providers use cookies, local storage, and similar technologies to operate, secure, and analyze use of the Service. Essential cookies are strictly necessary for the Service to function, including for authentication, session management, and security. [Describe any analytics or advertising technologies you add, and how a visitor can opt out.]'
      },
      {
        text: 'You can block or delete cookies in your browser settings. Blocking essential cookies stops sign-in from working.'
      },
      {
        text: 'Some web browsers transmit "Do-Not-Track" signals. Because there is no consistent industry standard for how to respond to these signals, we do not currently respond to them.'
      }
    ]
  },
  {
    title: '6. Third-Party Services',
    blocks: [
      {
        text: 'We engage trusted third-party service providers to help us operate the Service, including providers of cloud hosting, database, authentication, payments, email delivery, customer support, and analytics. They process personal information on our behalf and on our documented instructions, and only as necessary to perform their services. They are bound by written agreements that protect personal information. Our current sub-processors are: [list of sub-processors and what each does].'
      },
      {
        text: 'Some of our service providers are located outside your country. When personal information is transferred across borders, we apply safeguards that [data protection law, e.g. the GDPR] requires, such as [transfer mechanism, e.g. standard contractual clauses].'
      },
      {
        text: `In addition to our service providers, we may disclose personal information: (a) when required by law, regulation, court order, subpoena, or other valid legal process; (b) to government or regulatory authorities where required or permitted by law; (c) to protect the rights, property, or safety of ${site.name}, our users, or the public; (d) in connection with a merger, acquisition, financing, reorganization, sale of assets, or similar transaction, subject to standard confidentiality undertakings; and (e) with your consent or at your direction.`
      },
      {
        text: `The Service may contain links to third-party websites or services that are not operated by ${site.name}. This Privacy Policy does not apply to those websites or services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party websites or services that you access.`
      }
    ]
  },
  {
    title: '7. Your Data Privacy Rights',
    blocks: [
      {
        text: 'Subject to [data protection law, e.g. the GDPR] and applicable exceptions, you have the following rights with respect to your personal information:'
      },
      {
        text: '(a) Right to be informed about whether personal information pertaining to you is being or has been processed, including the purposes, recipients, and scope of such processing.'
      },
      {
        text: '(b) Right to access your personal information upon reasonable demand.'
      },
      {
        text: '(c) Right to object to the processing of your personal information, including processing for direct marketing or automated decision-making.'
      },
      {
        text: '(d) Right to dispute and rectify any inaccurate or incomplete personal information.'
      },
      {
        text: '(e) Right to request the erasure, blocking, or restriction of personal information that is incomplete, outdated, false, unlawfully obtained, or no longer necessary for the purposes for which it was collected.'
      },
      {
        text: '(f) Right to data portability, where applicable, to obtain a copy of your personal information in an electronic or structured format that is commonly used and allows for further use.'
      },
      {
        text: '(g) Right to withdraw consent at any time where we rely on consent, without affecting the lawfulness of processing before the withdrawal.'
      },
      {
        text: '(h) Right to lodge a complaint with [regulator, e.g. your local data protection authority].'
      },
      {
        heading: 'Closing your account',
        text: 'You can close your account yourself at any time by following the steps on our Support page. Closing an account ends your access to the Service and signs you out on every device. Closing an account deactivates it rather than erasing every record at once. Information we must keep to comply with legal obligations, resolve disputes, or defend legal claims is retained as described in Section 4.'
      },
      {
        text: `To exercise any of these rights, please contact us at ${site.contactEmail}. We may need to verify your identity before responding to your request. We respond within [response period, e.g. 30 days]. Certain rights are subject to limitations and exceptions under applicable law, and some rights may not be available where the processing is necessary for compliance with a legal obligation, the performance of a contract, or other lawful purposes.`
      }
    ]
  },
  {
    title: '8. Changes to this Privacy Policy',
    blocks: [
      {
        text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or applicable law. When we make material changes, we will post the updated Privacy Policy on this page, update the "Last updated" date above, and where appropriate notify you by email or through the Service. Your continued use of the Service after the effective date of the updated Privacy Policy constitutes your acceptance of the changes.'
      }
    ]
  },
  {
    title: '9. Contact Us',
    blocks: [
      {
        text: `If you have any questions, comments, or concerns about this Privacy Policy or our handling of your personal information, or if you wish to exercise any of your rights, please contact us at ${site.contactEmail}. [Add your data protection officer or privacy contact here if the law requires one.]`
      },
      {
        text: 'You may also contact [regulator, e.g. your local data protection authority] directly. [Link to the regulator\'s page on how to file a complaint.]'
      }
    ]
  }
]
</script>
