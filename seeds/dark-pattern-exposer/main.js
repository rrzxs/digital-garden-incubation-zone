(function () {
  'use strict';

  // === PALETTES ===
  var PALETTES = {
    crimson: {
      bg: '#0a0608', surface: 'rgba(127,29,29,0.08)', glow: '#ef4444',
      glowSoft: 'rgba(239,68,68,0.15)', accent: '#f97316', text: '#fca5a5',
      muted: 'rgba(252,165,165,0.4)', particle: [239, 68, 68]
    },
    abyss: {
      bg: '#040810', surface: 'rgba(30,58,138,0.08)', glow: '#3b82f6',
      glowSoft: 'rgba(59,130,246,0.15)', accent: '#06b6d4', text: '#93c5fd',
      muted: 'rgba(147,197,253,0.4)', particle: [59, 130, 246]
    },
    venom: {
      bg: '#030a04', surface: 'rgba(22,101,52,0.08)', glow: '#22c55e',
      glowSoft: 'rgba(34,197,94,0.15)', accent: '#84cc16', text: '#86efac',
      muted: 'rgba(134,239,172,0.4)', particle: [34, 197, 94]
    },
    void: {
      bg: '#08040f', surface: 'rgba(88,28,135,0.08)', glow: '#a855f7',
      glowSoft: 'rgba(168,85,247,0.15)', accent: '#ec4899', text: '#d8b4fe',
      muted: 'rgba(216,180,254,0.4)', particle: [168, 85, 247]
    }
  };

  var currentPalette = 'crimson';

  // === DARK PATTERN SCENES DATA ===
  var SCENES = [
    {
      title: 'The Sneaky Checkout',
      subtitle: 'E-Commerce Trap Zone',
      patterns: [
        {
          id: 'hidden-cost',
          type: 'Hidden Costs',
          danger: 85,
          label: 'Price Summary',
          ui: '<div class="widget-fake-ui"><div class="fake-price">$49.99</div><div class="fake-tooltip">+ shipping &amp; handling calculated at checkout</div><div class="fake-btn fake-btn-primary" style="margin-top:0.5rem">Buy Now</div></div>',
          explanation: 'Hidden costs are revealed only after the user has invested time and effort. The final price is intentionally obscured until the last step of checkout.',
          tip: 'Always look for the total cost breakdown before committing to a purchase.'
        },
        {
          id: 'forced-account',
          type: 'Forced Account',
          danger: 70,
          label: 'Guest Checkout',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.5rem">Continue as guest</div><div class="fake-btn fake-btn-primary" style="width:100%;text-align:center">Create Account to Continue</div><div style="font-size:0.6rem;color:#475569;margin-top:0.35rem;text-align:center">Account required for checkout</div></div>',
          explanation: 'The "Guest Checkout" option is a bait-and-switch. It claims to offer guest access but forces account creation, collecting user data unnecessarily.',
          tip: 'Legitimate services should allow guest checkout without forcing account creation.'
        },
        {
          id: 'pre-checked',
          type: 'Pre-checked Box',
          danger: 75,
          label: 'Order Confirmation',
          ui: '<div class="widget-fake-ui"><div class="fake-checkbox"><span class="fake-checkbox-box checked"></span> Send me promotional emails</div><div class="fake-checkbox" style="margin-top:0.4rem"><span class="fake-checkbox-box checked"></span> Share my data with partners</div><div class="fake-checkbox" style="margin-top:0.4rem"><span class="fake-checkbox-box"></span> I agree to terms of service</div></div>',
          explanation: 'Pre-checked opt-in boxes for marketing and data sharing are intentionally checked by default. The important consent box is left unchecked to create false hierarchy.',
          tip: 'Always scroll through and uncheck boxes you did not explicitly choose.'
        },
        {
          id: 'fake-urgency',
          type: 'Fake Urgency',
          danger: 80,
          label: 'Limited Deal',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#ef4444;text-transform:uppercase;letter-spacing:0.08em">Only 2 left in stock!</div><div class="fake-countdown" id="fake-timer-1">04:59</div><div class="fake-btn fake-btn-danger" style="margin-top:0.4rem">Order NOW before it\'s gone!</div><div style="font-size:0.6rem;color:#475569;margin-top:0.3rem">18 people are viewing this item</div></div>',
          explanation: 'Fake countdown timers, inflated viewer counts, and artificial scarcity create pressure to act immediately without thinking. The timer resets when it hits zero.',
          tip: 'Close the tab and reopen it. If the timer resets, the urgency is manufactured.'
        }
      ]
    },
    {
      title: 'The Subscription Maze',
      subtitle: 'Cancel If You Can',
      patterns: [
        {
          id: 'confirm-shaming',
          type: 'Confirmshaming',
          danger: 75,
          label: 'Exit Intent',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.8rem;color:#e2e8f0;margin-bottom:0.6rem;font-weight:600">Wait! Don\'t miss out!</div><div class="fake-btn fake-btn-primary" style="width:100%;text-align:center;margin-bottom:0.35rem">Stay and get 20% OFF</div><div class="fake-btn fake-btn-ghost" style="width:100%;text-align:center;font-size:0.68rem">No thanks, I prefer paying full price and missing deals</div></div>',
          explanation: 'Confirmshaming uses guilt and embarrassment to keep users engaged. The decline option is worded to make you feel foolish for choosing it.',
          tip: 'Never feel guilty about leaving. Ethical services respect your choice to opt out.'
        },
        {
          id: 'roach-motel',
          type: 'Roach Motel',
          danger: 90,
          label: 'Account Settings',
          ui: '<div class="widget-fake-ui"><div class="fake-btn fake-btn-primary" style="font-size:0.72rem">Upgrade to Premium</div><div class="fake-btn fake-btn-primary" style="font-size:0.72rem">Add Features</div><div class="fake-btn fake-btn-ghost" style="font-size:0.72rem;margin-top:0.5rem">Cancel Subscription</div><div style="font-size:0.58rem;color:#475569;margin-top:0.3rem">To cancel: contact support, wait 3-5 days, then confirm via email</div></div>',
          explanation: 'Signing up takes one click, but canceling requires multiple steps, phone calls, and waiting periods. This asymmetry is designed to wear down your persistence.',
          tip: 'Check cancellation policies before subscribing. You have the right to cancel easily.'
        },
        {
          id: 'trick-question',
          type: 'Trick Question',
          danger: 65,
          label: 'Unsubscribe',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#94a3b8;margin-bottom:0.5rem">Do you want to stop receiving all notifications?</div><div class="fake-checkbox"><span class="fake-checkbox-box"></span> Yes, unsubscribe from emails</div><div class="fake-checkbox" style="margin-top:0.4rem"><span class="fake-checkbox-box checked"></span> No, keep sending me offers</div><div style="font-size:0.58rem;color:#475569;margin-top:0.3rem">Unchecking both options will keep your current preferences</div></div>',
          explanation: 'Double negatives and confusing checkbox logic make it unclear what you are agreeing to. The pre-checked option keeps you subscribed.',
          tip: 'Read every word carefully. If it takes effort to understand, it is probably intentional.'
        },
        {
          id: 'sneak-into-basket',
          type: 'Sneak into Basket',
          danger: 80,
          label: 'Your Cart',
          ui: '<div class="widget-fake-ui"><div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:0.25rem"><span>Widget Pro</span><span>$29.99</span></div><div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:0.25rem"><span>Extended Warranty</span><span>$9.99</span></div><div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:0.25rem"><span>Premium Support</span><span>$4.99</span></div><div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:0.3rem;margin-top:0.3rem;display:flex;justify-content:space-between;font-size:0.72rem;font-weight:700;color:#f8fafc"><span>Total</span><span>$44.97</span></div></div>',
          explanation: 'Extra items are silently added to your cart without your explicit consent. These add-ons blend in with your legitimate purchases.',
          tip: 'Always review your cart line by line before paying. Remove anything you did not choose.'
        }
      ]
    },
    {
      title: 'The Privacy Parasite',
      subtitle: 'Consent Theater',
      patterns: [
        {
          id: 'privacy-zuckering',
          type: 'Privacy Zuckering',
          danger: 90,
          label: 'Privacy Settings',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#e2e8f0;margin-bottom:0.5rem;font-weight:600">Personalized Experience</div><div style="font-size:0.68rem;color:#94a3b8;margin-bottom:0.4rem">Allow us to use your data to create a better, more personalized experience just for you!</div><div class="fake-btn fake-btn-primary" style="font-size:0.68rem">Yes, personalize my experience</div><div style="font-size:0.58rem;color:#475569;margin-top:0.3rem">Managing privacy settings manually available in Account > Settings > Privacy > Advanced > Data</div></div>',
          explanation: 'Your data is framed as a benefit to you. The privacy controls are buried under 5 layers of menus. The "personalized experience" is a euphemism for surveillance.',
          tip: 'If privacy controls are hard to find, the company does not want you to use them.'
        },
        {
          id: 'consent-theater',
          type: 'Consent Theater',
          danger: 85,
          label: 'Cookie Banner',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#e2e8f0;margin-bottom:0.4rem;font-weight:600">We value your privacy</div><div style="font-size:0.62rem;color:#94a3b8;margin-bottom:0.5rem">We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.</div><div class="fake-btn fake-btn-primary" style="width:100%;text-align:center;font-size:0.7rem;margin-bottom:0.25rem">Accept All</div><div style="font-size:0.56rem;color:#64748b;text-align:center;text-decoration:underline;cursor:pointer">Manage preferences</div></div>',
          explanation: 'The "Accept All" button is large and prominent. The "Manage preferences" link is tiny, underlined, and leads to a confusing maze of toggles designed to exhaust you.',
          tip: 'Legitimate cookie consent should make accepting and rejecting equally easy.'
        },
        {
          id: 'bait-and-switch',
          type: 'Bait & Switch',
          danger: 70,
          label: 'Free Trial',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.82rem;font-weight:700;color:#22c55e">Start FREE Trial</div><div style="font-size:0.68rem;color:#94a3b8;margin:0.3rem 0">No credit card required*</div><div class="fake-btn fake-btn-success" style="font-size:0.7rem">Get Started Free</div><div style="font-size:0.52rem;color:#475569;margin-top:0.3rem">*Credit card required for verification. $49.99/month after 3-day trial. Auto-renews. Cancel anytime by calling support.</div></div>',
          explanation: '"No credit card required" is contradicted in the fine print. The trial is only 3 days and auto-renews at full price. Cancellation requires calling support.',
          tip: 'Always read the asterisk fine print. If a deal seems too good, look for the catch.'
        },
        {
          id: 'disguised-ads',
          type: 'Disguised Ads',
          danger: 60,
          label: 'Search Results',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.56rem;color:#64748b;margin-bottom:0.2rem">Sponsored</div><div style="font-size:0.72rem;color:#3b82f6;font-weight:600">Best Product 2024 - Official Site</div><div style="font-size:0.6rem;color:#22c55e">ad.example.com</div><div style="border-top:1px solid rgba(255,255,255,0.04);margin:0.4rem 0"></div><div style="font-size:0.72rem;color:#e2e8f0;font-weight:600">Actual Result You Wanted</div><div style="font-size:0.6rem;color:#64748b">real-result.com</div></div>',
          explanation: 'Paid advertisements are styled to look almost identical to organic search results. The "Sponsored" label is intentionally tiny and muted to blend in.',
          tip: 'Look for small "Ad" or "Sponsored" labels. The first results are often paid placements.'
        }
      ]
    },
    {
      title: 'The Emotional Manipulator',
      subtitle: 'Social Proof & Fear',
      patterns: [
        {
          id: 'fake-reviews',
          type: 'Fake Reviews',
          danger: 80,
          label: 'Product Reviews',
          ui: '<div class="widget-fake-ui"><div class="fake-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style="font-size:0.68rem;color:#94a3b8;margin-top:0.2rem">4.9 out of 5 (2,847 reviews)</div><div style="font-size:0.7rem;color:#e2e8f0;margin-top:0.4rem;font-weight:500">"Absolutely amazing! Best purchase ever!!"</div><div style="font-size:0.6rem;color:#64748b;margin-top:0.15rem">- Verified Buyer (incentivized review)</div></div>',
          explanation: 'Inflated ratings, incentivized reviews, and fake testimonials create false social proof. The "(incentivized review)" disclosure is buried in small text.',
          tip: 'Look for detailed, balanced reviews. Be skeptical of universal 5-star ratings.'
        },
        {
          id: 'fear-mongering',
          type: 'Fear Mongering',
          danger: 85,
          label: 'Security Alert',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#ef4444;font-weight:700">&#9888; Your device is at risk!</div><div style="font-size:0.65rem;color:#94a3b8;margin:0.3rem 0">3 critical vulnerabilities detected. Your personal data may be exposed to hackers.</div><div class="fake-btn fake-btn-danger" style="font-size:0.68rem">Fix Now</div><div style="font-size:0.52rem;color:#475569;margin-top:0.25rem">Premium protection $19.99/mo</div></div>',
          explanation: 'Fake security alerts use fear to drive immediate action. The "vulnerabilities" are fabricated, and the real goal is selling a subscription.',
          tip: 'Use trusted security software. Never click "Fix Now" on random alerts.'
        },
        {
          id: 'social-proof-fake',
          type: 'Fake Social Proof',
          danger: 70,
          label: 'Live Activity',
          ui: '<div class="widget-fake-ui"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem"><div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#fff">J</div><div style="font-size:0.65rem;color:#e2e8f0">Jessica from NYC just purchased this!</div></div><div style="display:flex;align-items:center;gap:0.5rem"><div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#fff">M</div><div style="font-size:0.65rem;color:#e2e8f0">Michael added this to his wishlist</div></div><div style="font-size:0.52rem;color:#475569;margin-top:0.35rem">2 minutes ago</div></div>',
          explanation: 'These "live" notifications are generated randomly. Names, locations, and actions are fabricated to create an illusion of popularity and social validation.',
          tip: 'Real-time purchase notifications are almost always simulated. Do not let FOMO drive your decisions.'
        },
        {
          id: 'visual-interference',
          type: 'Visual Interference',
          danger: 75,
          label: 'Download Page',
          ui: '<div class="widget-fake-ui"><div class="fake-btn fake-btn-primary" style="width:100%;text-align:center;font-size:0.85rem;font-weight:800;padding:0.65rem">DOWNLOAD NOW &#9660;</div><div style="font-size:0.5rem;color:#64748b;margin:0.3rem 0;text-align:center">Sponsored advertisement</div><div style="border-top:1px solid rgba(255,255,255,0.06);margin:0.3rem 0"></div><div class="fake-btn fake-btn-ghost" style="font-size:0.65rem">Download (slow)</div></div>',
          explanation: 'The giant "DOWNLOAD NOW" button is actually an ad. The real download link is a small, understated button below. Visual hierarchy is inverted to trick clicks.',
          tip: 'On download pages, the biggest button is often the ad. Look for smaller, less prominent links.'
        }
      ]
    },
    {
      title: 'The Infinite Scroll Trap',
      subtitle: 'Attention Capture',
      patterns: [
        {
          id: 'attention-capture',
          type: 'Attention Capture',
          danger: 70,
          label: 'Feed Timer',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#e2e8f0;font-weight:600;margin-bottom:0.3rem">You\'ve been scrolling for</div><div style="font-family:var(--font-display);font-size:2rem;font-weight:900;color:#f8fafc" id="scroll-timer">00:00</div><div style="font-size:0.62rem;color:#94a3b8;margin-top:0.2rem">Auto-play keeps loading new content. There is no natural stopping point.</div></div>',
          explanation: 'Infinite scroll and auto-play remove natural stopping cues. Without end points, your brain cannot trigger the "stop" decision, leading to hours of unintended use.',
          tip: 'Set a timer before opening social media. Force yourself to take breaks.'
        },
        {
          id: 'nudge-loop',
          type: 'Nudge Loop',
          danger: 65,
          label: 'Turn Off Notifications',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.72rem;color:#e2e8f0;font-weight:600;margin-bottom:0.4rem">Are you sure?</div><div class="fake-btn fake-btn-ghost" style="width:100%;text-align:center;font-size:0.68rem;margin-bottom:0.25rem">Keep notifications ON</div><div class="fake-btn fake-btn-ghost" style="width:100%;text-align:center;font-size:0.68rem;margin-bottom:0.25rem">Maybe later</div><div class="fake-btn fake-btn-ghost" style="width:100%;text-align:center;font-size:0.68rem">I\'ll decide later</div><div style="font-size:0.52rem;color:#475569;margin-top:0.3rem;text-align:center;text-decoration:underline">Turn off</div></div>',
          explanation: 'Three positive options to keep notifications vs. one tiny "Turn off" link. This asymmetric choice architecture makes the desired action the path of least resistance.',
          tip: 'If turning something off requires hunting for a tiny link, the design is manipulative.'
        },
        {
          id: 'gamification',
          type: 'Gamification',
          danger: 60,
          label: 'Streak Counter',
          ui: '<div class="widget-fake-ui"><div style="text-align:center"><div style="font-size:1.8rem">&#x1F525;</div><div style="font-family:var(--font-display);font-size:1.5rem;font-weight:900;color:#f97316">14 Day Streak!</div><div style="font-size:0.62rem;color:#94a3b8;margin-top:0.2rem">Don\'t break your streak! Visit tomorrow.</div><div class="fake-btn fake-btn-primary" style="font-size:0.65rem;margin-top:0.4rem">Keep It Going!</div></div></div>',
          explanation: 'Streaks exploit loss aversion. You feel pain from losing the streak more than pleasure from keeping it. This keeps you coming back daily out of fear, not enjoyment.',
          tip: 'Your worth is not defined by a streak number. It is okay to miss days.'
        },
        {
          id: 'default-effect',
          type: 'Default Effect',
          danger: 65,
          label: 'App Permissions',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.68rem;color:#e2e8f0;margin-bottom:0.4rem">This app needs permissions:</div><div class="fake-checkbox"><span class="fake-checkbox-box checked"></span> Location access</div><div class="fake-checkbox" style="margin-top:0.3rem"><span class="fake-checkbox-box checked"></span> Contacts</div><div class="fake-checkbox" style="margin-top:0.3rem"><span class="fake-checkbox-box checked"></span> Camera &amp; Microphone</div><div class="fake-checkbox" style="margin-top:0.3rem"><span class="fake-checkbox-box checked"></span> Photos &amp; Media</div><div class="fake-btn fake-btn-primary" style="width:100%;text-align:center;font-size:0.65rem;margin-top:0.5rem">Allow All &amp; Continue</div></div>',
          explanation: 'All permissions are pre-granted with a single "Allow All" button. There is no individual deny option presented. The app does not need most of these to function.',
          tip: 'Grant permissions individually. Ask: does this app really need access to my camera?'
        }
      ]
    },
    {
      title: 'The Comparison Trap',
      subtitle: 'Pricing Illusions',
      patterns: [
        {
          id: 'price-anchoring',
          type: 'Price Anchoring',
          danger: 70,
          label: 'Plan Selection',
          ui: '<div class="widget-fake-ui"><div style="display:flex;gap:0.4rem;align-items:flex-end"><div style="flex:1;text-align:center;padding:0.4rem;border:1px solid rgba(255,255,255,0.06);border-radius:6px"><div style="font-size:0.6rem;color:#64748b">Basic</div><div style="font-size:0.9rem;font-weight:700;color:#94a3b8">$9</div></div><div style="flex:1;text-align:center;padding:0.4rem;border:2px solid #3b82f6;border-radius:6px;background:rgba(59,130,246,0.08);position:relative"><div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#3b82f6;font-size:0.48rem;padding:0.1rem 0.4rem;border-radius:100px;color:#fff">POPULAR</div><div style="font-size:0.6rem;color:#93c5fd">Pro</div><div style="font-size:0.9rem;font-weight:700;color:#f8fafc">$29</div></div><div style="flex:1;text-align:center;padding:0.4rem;border:1px solid rgba(255,255,255,0.06);border-radius:6px"><div style="font-size:0.6rem;color:#64748b">Enterprise</div><div style="font-size:0.9rem;font-weight:700;color:#94a3b8">$99</div></div></div></div>',
          explanation: 'The "Pro" plan is highlighted as "POPULAR" to guide you toward it. The Basic plan feels too limited and Enterprise too expensive. The choice is made for you.',
          tip: 'Ignore "Most Popular" badges. Evaluate plans based on your actual needs.'
        },
        {
          id: 'decoy-pricing',
          type: 'Decoy Pricing',
          danger: 75,
          label: 'Subscription Tiers',
          ui: '<div class="widget-fake-ui"><div style="margin-bottom:0.5rem"><div style="font-size:0.68rem;color:#94a3b8">Small Popcorn</div><div style="font-size:0.85rem;font-weight:700;color:#94a3b8">$3.00</div></div><div style="margin-bottom:0.5rem"><div style="font-size:0.68rem;color:#f8fafc;font-weight:600">Medium Popcorn</div><div style="font-size:0.85rem;font-weight:700;color:#f8fafc">$6.50</div></div><div><div style="font-size:0.68rem;color:#94a3b8">Large Popcorn</div><div style="font-size:0.85rem;font-weight:700;color:#94a3b8">$7.00</div><div style="font-size:0.52rem;color:#f97316">Best value!</div></div></div>',
          explanation: 'The medium is priced close to large, making large seem like a great deal. The small is there to make medium look reasonable. The decoy (medium) steers you to large.',
          tip: 'Compare prices relative to what you need, not relative to other options presented.'
        },
        {
          id: 'drip-pricing',
          type: 'Drip Pricing',
          danger: 80,
          label: 'Flight Booking',
          ui: '<div class="widget-fake-ui"><div style="display:flex;justify-content:space-between;font-size:0.68rem;margin-bottom:0.15rem"><span>Base fare</span><span>$99</span></div><div style="display:flex;justify-content:space-between;font-size:0.68rem;margin-bottom:0.15rem"><span>+ Taxes</span><span>$32</span></div><div style="display:flex;justify-content:space-between;font-size:0.68rem;margin-bottom:0.15rem"><span>+ Seat selection</span><span>$15</span></div><div style="display:flex;justify-content:space-between;font-size:0.68rem;margin-bottom:0.15rem"><span>+ Baggage fee</span><span>$25</span></div><div style="display:flex;justify-content:space-between;font-size:0.68rem;margin-bottom:0.15rem"><span>+ Booking fee</span><span>$8</span></div><div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:0.3rem;margin-top:0.3rem;display:flex;justify-content:space-between;font-size:0.75rem;font-weight:700;color:#f8fafc"><span>Total</span><span>$179</span></div></div>',
          explanation: 'The advertised $99 fare becomes $179 after mandatory fees are dripped in step by step. Each individual fee seems small, but they add up to nearly double the base price.',
          tip: 'Always sort by "total price" when comparing. The base price is rarely what you pay.'
        },
        {
          id: 'obfuscation',
          type: 'Obfuscation',
          danger: 70,
          label: 'Data Usage',
          ui: '<div class="widget-fake-ui"><div style="font-size:0.68rem;color:#e2e8f0;font-weight:600;margin-bottom:0.4rem">Your monthly usage</div><div style="height:8px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden;margin-bottom:0.3rem"><div style="width:73%;height:100%;background:linear-gradient(90deg,#22c55e,#f97316);border-radius:100px"></div></div><div style="display:flex;justify-content:space-between;font-size:0.58rem;color:#94a3b8"><span>0 MB</span><span>7.3 GB of 10 GB</span></div><div style="font-size:0.52rem;color:#475569;margin-top:0.3rem">Overage charges: $0.015/MB. Throttled speeds after cap. Reset: billing cycle.</div></div>',
          explanation: 'Usage is shown in mixed units (MB and GB) with unclear thresholds. The overage rate in MB hides the real cost. The intent is confusion about when you will be charged.',
          tip: 'Convert all units to the same scale. Calculate the actual overage cost in familiar terms.'
        }
      ]
    }
  ];

  // === STATE ===
  var state = {
    currentScene: 0,
    foundPatterns: {},
    mode: 'scan',
    totalPatterns: 0,
    foundCount: 0
  };

  SCENES.forEach(function (scene) {
    scene.patterns.forEach(function (p) {
      state.foundPatterns[p.id] = false;
      state.totalPatterns++;
    });
  });

  // === DOM ===
  var viewport = document.getElementById('scene-viewport');
  var dotsContainer = document.getElementById('scene-dots');
  var prevBtn = document.getElementById('prev-scene');
  var nextBtn = document.getElementById('next-scene');
  var foundEl = document.getElementById('found-count');
  var totalEl = document.getElementById('total-count');
  var sceneIndicator = document.getElementById('scene-indicator');
  var revealPanel = document.getElementById('reveal-panel');
  var revealIcon = document.getElementById('reveal-icon');
  var revealTitle = document.getElementById('reveal-title');
  var revealDesc = document.getElementById('reveal-desc');
  var meterFill = document.getElementById('meter-fill');
  var heroDynamic = document.getElementById('hero-dynamic');
  var toastContainer = document.getElementById('toast-container');
  var canvas = document.getElementById('particle-canvas');
  var ctx = canvas.getContext('2d');

  // === PARTICLES ===
  var particles = [];
  var PARTICLE_COUNT = 60;
  var mouseX = 0;
  var mouseY = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var pal = PALETTES[currentPalette];
    var r = pal.particle[0];
    var g = pal.particle[1];
    var b = pal.particle[2];

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      var dx = mouseX - p.x;
      var dy = mouseY - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        var force = (150 - dist) / 150 * 0.02;
        p.vx += dx * force;
        p.vy += dy * force;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + p.alpha + ')';
      ctx.fill();

      for (var j = i + 1; j < particles.length; j++) {
        var p2 = particles[j];
        var d = Math.sqrt((p.x - p2.x) * (p.x - p2.x) + (p.y - p2.y) * (p.y - p2.y));
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.08 * (1 - d / 120)) + ')';
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawParticles);
  }

  resizeCanvas();
  createParticles();
  drawParticles();

  window.addEventListener('resize', function () {
    resizeCanvas();
    createParticles();
  });

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // === RENDER SCENES ===
  function renderScenes() {
    viewport.innerHTML = '';
    dotsContainer.innerHTML = '';

    SCENES.forEach(function (scene, si) {
      var card = document.createElement('div');
      card.className = 'scene-card' + (si === state.currentScene ? ' active' : '');
      card.dataset.index = si;

      var html = '<div class="scene-title">' + scene.title + '</div>';
      html += '<div class="scene-subtitle">' + scene.subtitle + '</div>';
      html += '<div class="scene-ui">';

      scene.patterns.forEach(function (pattern) {
        var exposed = state.foundPatterns[pattern.id] ? ' exposed' : '';
        html += '<div class="ui-widget' + exposed + '" data-pattern-id="' + pattern.id + '">';
        html += '<div class="pattern-badge">' + pattern.type + '</div>';
        html += '<div class="expose-overlay"></div>';
        html += '<div class="widget-content">';
        html += '<div class="widget-label">' + pattern.label + '</div>';
        html += pattern.ui;
        html += '</div></div>';
      });

      html += '</div>';
      card.innerHTML = html;
      viewport.appendChild(card);

      var dot = document.createElement('button');
      dot.className = 'scene-dot' + (si === state.currentScene ? ' active' : '');
      dot.dataset.index = si;
      dot.addEventListener('click', function () {
        goToScene(si);
      });
      dotsContainer.appendChild(dot);
    });

    updateScore();
  }

  function goToScene(index) {
    if (index < 0 || index >= SCENES.length || index === state.currentScene) return;

    var cards = viewport.querySelectorAll('.scene-card');
    var direction = index > state.currentScene ? 'left' : 'right';

    cards.forEach(function (card) {
      if (parseInt(card.dataset.index) === state.currentScene) {
        card.classList.remove('active');
        card.classList.add(direction === 'left' ? 'exit-left' : 'exit-right');
      }
    });

    state.currentScene = index;

    setTimeout(function () {
      cards.forEach(function (card) {
        card.classList.remove('exit-left', 'exit-right', 'active');
        if (parseInt(card.dataset.index) === state.currentScene) {
          card.classList.add('active');
        }
      });

      var dots = dotsContainer.querySelectorAll('.scene-dot');
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === state.currentScene);
      });

      updateNavButtons();
      updateSceneIndicator();
    }, 100);
  }

  function updateNavButtons() {
    prevBtn.disabled = state.currentScene === 0;
    nextBtn.disabled = state.currentScene === SCENES.length - 1;
  }

  function updateSceneIndicator() {
    sceneIndicator.textContent = (state.currentScene + 1) + ' / ' + SCENES.length;
  }

  function updateScore() {
    foundEl.textContent = state.foundCount;
    totalEl.textContent = state.totalPatterns;
  }

  // === PATTERN CLICK HANDLER ===
  viewport.addEventListener('click', function (e) {
    var widget = e.target.closest('.ui-widget');
    if (!widget) return;

    var patternId = widget.dataset.patternId;
    if (!patternId) return;

    var pattern = null;
    SCENES.forEach(function (scene) {
      scene.patterns.forEach(function (p) {
        if (p.id === patternId) pattern = p;
      });
    });

    if (!pattern) return;

    if (!state.foundPatterns[patternId]) {
      state.foundPatterns[patternId] = true;
      state.foundCount++;
      widget.classList.add('exposed');
      updateScore();
      showToast('Exposed: ' + pattern.type, pattern.explanation);
    }

    showReveal(pattern);
  });

  function showReveal(pattern) {
    revealPanel.classList.add('highlighted');
    revealIcon.textContent = '\u{1F6A8}';
    revealTitle.textContent = pattern.type + ' Detected';
    revealDesc.textContent = pattern.explanation;
    meterFill.style.width = pattern.danger + '%';
  }

  function resetReveal() {
    revealPanel.classList.remove('highlighted');
    revealIcon.textContent = '\u{1F50D}';
    revealTitle.textContent = 'Click a suspicious element';
    revealDesc.textContent = 'Hover over the simulated UI cards to find dark patterns. When you spot something fishy, click to expose it.';
    meterFill.style.width = '0%';
  }

  // === TOAST ===
  function showToast(title, desc) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast-icon">&#x2726;</span><div><strong>' + title + '</strong><div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.15rem;line-height:1.4;max-height:60px;overflow:hidden">' + desc.substring(0, 120) + '...</div></div>';
    toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('exit');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 3500);
  }

  // === NAVIGATION ===
  prevBtn.addEventListener('click', function () {
    goToScene(state.currentScene - 1);
    resetReveal();
  });

  nextBtn.addEventListener('click', function () {
    goToScene(state.currentScene + 1);
    resetReveal();
  });

  // === MODE BUTTONS ===
  var modeBtns = document.querySelectorAll('.ctrl-btn[data-mode]');
  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.mode = btn.dataset.mode;

      if (state.mode === 'xray') {
        document.querySelectorAll('.ui-widget').forEach(function (w) {
          w.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          w.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          w.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.08)';
        });
      } else if (state.mode === 'scan') {
        document.querySelectorAll('.ui-widget').forEach(function (w) {
          if (!w.classList.contains('exposed')) {
            w.style.borderColor = '';
            w.style.boxShadow = '';
          }
        });
      } else if (state.mode === 'educate') {
        var allPatterns = [];
        SCENES.forEach(function (scene) {
          scene.patterns.forEach(function (p) {
            if (!state.foundPatterns[p.id]) {
              allPatterns.push(p);
            }
          });
        });
        if (allPatterns.length > 0) {
          showReveal(allPatterns[0]);
          showToast('Education Mode', 'Patterns you haven\'t found yet are highlighted. Click to learn about each one.');
        }
        document.querySelectorAll('.ui-widget').forEach(function (w) {
          var pid = w.dataset.patternId;
          if (!state.foundPatterns[pid]) {
            w.style.borderColor = 'rgba(249, 115, 22, 0.3)';
            w.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.1)';
            w.style.animation = 'badge-pulse 2s infinite ease-in-out';
          }
        });
      }
    });
  });

  // === PALETTE SWITCHER ===
  var paletteDots = document.querySelectorAll('.palette-dot');
  paletteDots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      paletteDots.forEach(function (d) { d.classList.remove('active'); });
      dot.classList.add('active');
      currentPalette = dot.dataset.palette;
      applyPalette(currentPalette);
    });
  });

  function applyPalette(name) {
    var pal = PALETTES[name];
    if (!pal) return;
    var root = document.documentElement;
    root.style.setProperty('--bg', pal.bg);
    root.style.setProperty('--surface', pal.surface);
    root.style.setProperty('--glow', pal.glow);
    root.style.setProperty('--glow-soft', pal.glowSoft);
    root.style.setProperty('--accent', pal.accent);
    root.style.setProperty('--text', pal.text);
    root.style.setProperty('--text-muted', pal.muted);
  }

  // === HERO DYNAMIC TEXT ===
  var heroWords = ['Manipulation', 'Deception', 'Dark Patterns', 'Trickery', 'Illusion'];
  var heroIndex = 0;

  function cycleHeroText() {
    heroDynamic.style.opacity = '0';
    heroDynamic.style.transform = 'translateY(8px)';
    heroDynamic.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

    setTimeout(function () {
      heroIndex = (heroIndex + 1) % heroWords.length;
      heroDynamic.textContent = heroWords[heroIndex];
      heroDynamic.style.opacity = '1';
      heroDynamic.style.transform = 'translateY(0)';
    }, 400);
  }

  setInterval(cycleHeroText, 3000);

  // === FAKE COUNTDOWN TIMER ===
  setInterval(function () {
    var timers = document.querySelectorAll('.fake-countdown');
    timers.forEach(function (timer) {
      var parts = timer.textContent.split(':');
      var min = parseInt(parts[0]) || 0;
      var sec = parseInt(parts[1]) || 0;
      var total = min * 60 + sec;
      if (total <= 0) total = 300;
      total--;
      var nm = Math.floor(total / 60);
      var ns = total % 60;
      timer.textContent = (nm < 10 ? '0' : '') + nm + ':' + (ns < 10 ? '0' : '') + ns;
    });
  }, 1000);

  // === SCROLL TIMER ===
  setInterval(function () {
    var el = document.getElementById('scroll-timer');
    if (!el) return;
    var parts = el.textContent.split(':');
    var min = parseInt(parts[0]) || 0;
    var sec = parseInt(parts[1]) || 0;
    sec++;
    if (sec >= 60) { sec = 0; min++; }
    el.textContent = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
  }, 1000);

  // === KEYBOARD NAV ===
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') {
      goToScene(state.currentScene - 1);
      resetReveal();
    } else if (e.key === 'ArrowRight') {
      goToScene(state.currentScene + 1);
      resetReveal();
    }
  });

  // === INIT ===
  renderScenes();
  updateNavButtons();
  updateSceneIndicator();
  totalEl.textContent = state.totalPatterns;
})();
