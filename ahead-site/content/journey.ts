/**
 * The patient journey band.
 *
 * ⚠️ Step five originally claimed add-to-wallet. That depends on the banking
 * partner holding network certification (VDEP/MDES) AND supporting push
 * provisioning from a *mobile web* flow — which is materially more constrained
 * than in-app, especially on iOS. Nothing confirms it, so this ships with the
 * safe wording, which is true either way.
 *
 * When the partner confirms, set `walletConfirmed = true` and the claim below
 * switches back. That is the only change needed.
 */
export const walletConfirmed = false

const stepFiveConfirmed = {
  eyebrow: 'Step five',
  title: 'Into their wallet',
  body: "Added to the phone's wallet without leaving the page. Nothing to activate, nothing to wait for.",
}

const stepFiveSafe = {
  eyebrow: 'Step five',
  title: 'Ready to use',
  body: 'The card works immediately, on the phone or added to their wallet. Nothing to activate, nothing to wait for.',
}

export const journey = {
  id: 'patient-journey',
  heading: 'A text message, and the money is ready before they are.',
  lede: 'No app to download, no account to create, no password. The link arrives by text, the questions are the ones a rule actually needs, and the card is in their wallet before they leave the page.',
  steps: [
    {
      eyebrow: 'Step one',
      title: 'The text arrives',
      body: 'A link. No app, no account, no password. It opens on the phone it arrived on.',
    },
    {
      eyebrow: 'Step two',
      title: 'One page',
      body: 'The questions exist because a rule needs the answer. Turn a requirement off and its question disappears.',
    },
    {
      eyebrow: 'Step three',
      title: 'Answered on submit',
      body: 'Under a second. They are told what they qualify for on the same screen — or which requirement was not met, in plain words.',
    },
    {
      eyebrow: 'Step four',
      title: 'The card is issued',
      body: 'Virtual, in the same minute, with funds already shaped to what they qualify for.',
    },
    walletConfirmed ? stepFiveConfirmed : stepFiveSafe,
  ],
  caregiver: 'A caregiver is added in the same flow, not a second one.',
} as const
