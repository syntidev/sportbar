---
name: Stadium High-Octane
colors:
  surface: '#121412'
  surface-dim: '#121412'
  surface-bright: '#383a37'
  surface-container-lowest: '#0d0f0c'
  surface-container-low: '#1a1c1a'
  surface-container: '#1e201e'
  surface-container-high: '#282a28'
  surface-container-highest: '#333532'
  on-surface: '#e2e3de'
  on-surface-variant: '#d7c3ae'
  inverse-surface: '#e2e3de'
  inverse-on-surface: '#2f312e'
  outline: '#9f8e7a'
  outline-variant: '#524534'
  surface-tint: '#ffb955'
  primary: '#ffc880'
  on-primary: '#452b00'
  primary-container: '#f5a623'
  on-primary-container: '#644000'
  inverse-primary: '#835500'
  secondary: '#c5c7c2'
  on-secondary: '#2e312e'
  secondary-container: '#474a46'
  on-secondary-container: '#b7b9b4'
  tertiary: '#57ec8d'
  on-tertiary: '#003919'
  tertiary-container: '#33cf74'
  on-tertiary-container: '#005328'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb4'
  primary-fixed-dim: '#ffb955'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#e1e3de'
  secondary-fixed-dim: '#c5c7c2'
  on-secondary-fixed: '#191c19'
  on-secondary-fixed-variant: '#454744'
  tertiary-fixed: '#6bfe9c'
  tertiary-fixed-dim: '#4ae183'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#121412'
  on-background: '#e2e3de'
  surface-variant: '#333532'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style
The design system is engineered to capture the kinetic energy of a live basketball arena. It targets a passionate audience that values speed, intensity, and the social ritual of sports viewing. The visual language is high-contrast and immersive, utilizing a deep-black foundation to make food photography and action-oriented content pop with stadium-light intensity.

The style is a fusion of **High-Contrast Bold** and **Glassmorphism**. It leverages large-scale typography, aggressive color accents, and semi-transparent layers to create a sense of depth and modern sophistication. The emotional response should be one of excitement and "game-day" readiness, moving away from standard utility toward an entertainment-first experience.

## Colors
The palette is dominated by the **Rich Dark (#080A08)** background, which serves as the "stadium floor." The **Vibrant Orange (#F5A623)** primary accent draws inspiration from basketball leather and court markings, used exclusively for calls to action and critical interactive states.

- **Primary Background:** #080A08 (Pitch black for maximum OLED contrast).
- **Surface/Card:** #1A1D1A (Deep charcoal for subtle separation).
- **Accent/Action:** #F5A623 (Energetic orange).
- **Success/Status:** #2ECC71 (Court green for order confirmations).
- **Typography:** Pure White (#FFFFFF) for high legibility against dark backgrounds, with diminished grays for secondary metadata.

## Typography
The typography system uses **Sora** for all display and headline roles. Sora’s geometric construction and wide stance evoke a technical, athletic feel that mirrors sports broadcasting graphics. Headlines should utilize heavy weights (700-800) to maintain visual hierarchy against vibrant imagery.

**Inter** is utilized for body text and interface labels to ensure maximum readability in low-light environments. For interactive elements like buttons and category chips, labels are set in uppercase with slight letter spacing to mimic jersey lettering and stadium signage.

## Layout & Spacing
The layout follows a **fluid 12-column grid** for desktop and a **4-column grid** for mobile. The rhythm is based on an 8px square baseline, ensuring all components align with a consistent mathematical scale.

- **Margins:** Mobile screens use a 20px side margin to provide breathing room for "frame-breaking" product photography.
- **Gutters:** 16px fixed gutters maintain tight association between grouped items.
- **Dynamic Padding:** Large vertical spacing (40px-64px) is encouraged between major sections to mimic the expansive feel of a stadium bowl.

## Elevation & Depth
Depth is achieved through a combination of **Tonal Layering** and **Glassmorphism**.
- **Level 0 (Background):** #080A08.
- **Level 1 (Cards/Lists):** #1A1D1A with no shadow, but a 1px subtle stroke (#FFFFFF at 5% opacity).
- **Level 2 (Overlays/Modals):** A frosted glass effect using a 20px backdrop-blur and a semi-transparent fill (#1A1D1A at 70% opacity). This allows the vibrant primary background colors to bleed through slightly.
- **3D Interaction:** Product images (burgers, drinks, appetizers) should use a "frame-breaking" technique, where the image is z-indexed above its container and features a soft, 30% opacity black drop-shadow to create a "floating" 3D effect.

## Shapes
The shape language is bold and friendly, utilizing a **Rounded (Level 2)** system. 
- **Standard Components:** Buttons, input fields, and small cards use a 16px (`rounded-lg`) corner radius.
- **Main Containers:** Large promotional cards and hero sections use a 24px (`rounded-xl`) radius.
- **Interactive Feedback:** Elements should subtly scale up (1.02x) on interaction to emphasize the 3D, tactile nature of the design.

## Components
- **Buttons:** Primary buttons are solid #F5A623 with black text, using high-impact Sora Bold. Secondary buttons use a "ghost" style with a 2px orange border.
- **Cards:** Product cards must feature "breaking the frame" imagery. The food item should overlap the top or side border of the container to create depth.
- **Chips:** Used for food categories (e.g., "Wings", "Burgers"). These use a dark gray background with white text, switching to primary orange when selected.
- **Input Fields:** Deep charcoal fills with a subtle 1px border. On focus, the border glows with the primary orange and a soft outer shadow.
- **Navigation:** A bottom-fixed glassmorphic bar on mobile, utilizing high-contrast icons and a 20px backdrop blur to maintain visibility over scrolling content.
- **Progress Indicators:** Use a "Scoreboard" aesthetic—monospaced numbers and high-contrast segments for tracking order status (Cooking, Out for Delivery, Arrived).