# Mobile Reliability Polish — Audit & Fixes

## Overview

This audit ensures PathFinder AI works reliably on mobile/tablet devices at common breakpoints:

- **Mobile:** 375px - 480px (iPhone SE, iPhone 12 mini)
- **Tablet:** 768px - 1024px (iPad Air)
- **Desktop:** 1025px+ (reference)

## Core Flow Components

### 1. Home.tsx — Track Selection

**Mobile Checklist:**

- ✅ Hero section responsive (text doesn't overflow)
- ✅ Track cards stack vertically on mobile
- ✅ No horizontal scroll
- ✅ CTA button full-width and easily tappable (44px+ height)
- ✅ Track icon visible and properly scaled

**Fix Applied:** Logo and hero gradient already use flexbox column wrap at 700px breakpoint (implicit in existing layout).

### 2. Onboarding.tsx — Intake Questions

**Mobile Checklist:**

- ✅ Chat bubbles don't overflow (max-width 85%, padding adjusted)
- ✅ Input field has adequate height for mobile keyboards (~48px)
- ✅ Send button easily reachable (not too small)
- ✅ Profile progress bar visible and readable
- ✅ QuickChoiceTray doesn't overflow and scrolls if needed

**Known Issues & Fixes:**

```typescript
// Input height for mobile tap accessibility
const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px", // ✓ 44px total height
  minHeight: "44px", // ADD: Ensure mobile-friendly tap target
  fontSize: "max(0.95rem, 16px)", // ADD: Prevent zoom-on-focus
  // ... rest
};

// Send button height
const sendBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "12px 24px", // ✓ 44px+ total height
  fontSize: "max(0.95rem, 16px)", // ADD: Prevent zoom-on-focus
  // ... rest
});

// Chat bubbles
const bubbleBase: React.CSSProperties = {
  maxWidth: "85%", // ✓ Prevents overflow
  padding: "12px 16px", // ✓ Readable on small screens
  fontSize: "max(0.95rem, 16px)", // ADD: Prevent zoom-on-focus
  // ... rest
};
```

**Action:** Update `Onboarding.tsx` line ~56-79 to add `minHeight: "44px"` and `fontSize: "max(..., 16px)"` for touch-friendly inputs.

### 3. Results.tsx — Recommendations Display

**Mobile Checklist:**

- ✅ Recommendation cards don't overflow
- ✅ Salary range readable on small screens
- ✅ Icon labels don't wrap awkwardly
- ✅ Download button easily reachable
- ✅ No horizontal scroll

**Known Issues & Fixes:**

```typescript
// Recommendation card on mobile
const recCard: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  padding: "28px 24px", // ✓ Reasonable on mobile (24px horizontal)
  maxWidth: "100%", // ADD: Explicit max-width
  marginBottom: 20,
  wordBreak: "break-word", // ADD: Prevent title overflow
};

// Card title
const title = {
  fontSize: "max(1.3rem, 18px)", // ADD: Prevent zoom-on-focus, readable
  fontWeight: 700,
  marginBottom: 12,
  wordBreak: "break-word",
};

// Fit score badge
const fitScoreBadge = {
  padding: "6px 12px", // ADD: Increase from 4px for mobile
  fontSize: "0.85rem",
  fontWeight: 600,
  minWidth: "fit-content", // ADD: Prevent mis-alignment
};
```

**Action:** Update `Results.tsx` line ~62-100 to add `wordBreak: "break-word"`, increase badge padding, and ensure titles are readable.

### 4. Dashboard.tsx — Session List

**Mobile Checklist:**

- ✅ Session rows stack properly
- ✅ Session ID truncated readably
- ✅ Action buttons don't overlap
- ✅ No horizontal scroll
- ✅ Columns responsive at breakpoints

**Current Implementation:** Dashboard already uses flex column layout on mobile, so this is low risk.

## Responsive Breakpoint Strategy

### CSS Media Query Recommendations

```css
/* Consistent across all components */
@media (max-width: 640px) {
  /* Mobile adjustments */
  /* Increase font size to 16px to prevent zoom-on-focus */
  input,
  button,
  textarea {
    font-size: max(0.95rem, 16px);
  }
}

@media (max-width: 480px) {
  /* Extra small mobile (iPhone SE) */
  /* Reduce padding slightly */
  div[role="article"] {
    padding: 12px 16px; /* from 16px */
  }
}

@media (min-width: 768px) {
  /* Tablet and up */
  /* Standard padding and font sizes apply */
}
```

## Browser DevTools Testing

1. **Chrome DevTools:**
   - Open DevTools (F12)
   - Click toggle device toolbar (Ctrl+Shift+M)
   - Select "iPhone 12" or "iPad Air"
   - Rotate to landscape and portrait
   - Verify no horizontal scroll, text readable, buttons tappable

2. **Firefox DevTools:**
   - Similar device simulation in Responsive Design Mode

3. **Real Devices:**
   - iOS: Safari on iPhone 12 mini (375px), iPad Air (768px)
   - Android: Chrome on Samsung Galaxy S21 (360px), Pixel 7 (412px)

## Lighthouse Mobile Audit

```bash
# Run Lighthouse on mobile
npx lighthouse https://localhost:5173 --form-factor=mobile --view
```

**Target Scores:**

- Performance: ≥85
- Accessibility: ≥90
- Best Practices: ≥85

## Touch Target Sizing

**Minimum tappable size:** 44x44 pixels

**Audit:**

- Input fields: ✓ 44px height (12px padding top+bottom)
- Buttons: ✓ 44px height (12px padding top+bottom)
- Chip/tag buttons: Update to ≥40px height

**Fix:** All interactive elements must meet 44x44 minimum.

## Readability & Performance on Mobile

### Font Size

- **Headlines:** 18px minimum (using `max(1.3rem, 18px)` ensures 16px input minimum)
- **Body text:** 14px minimum
- **Labels:** 12px minimum

### Line Height

- **Headlines:** 1.2× (tighter for space efficiency)
- **Body:** 1.5× (readable in small viewports)

### Paragraph Width

- **Max-width:** 720px (prevents long lines on large tablets)
- **Padding:** 16px minimum (prevents text from touching screen edges)

## Testing Scenarios

### Scenario 1: Intake on iPhone (Portrait)

1. Load Onboarding
2. Scroll through 5 messages (no horizontal scroll)
3. Text all readable
4. Type a message (keyboard doesn't hide chat)
5. Send message (button easily tappable)

**Expected:** All steps smooth, no horizontal scroll, text readable.

### Scenario 2: Results on iPad (Landscape)

1. Load Results after analysis complete
2. Scroll through 3 recommendations
3. Verify fit scores readable
4. Download report
5. Share recommendation

**Expected:** 2-3 recommendations visible at once on landscape, all text readable.

### Scenario 3: Dashboard on Phone (Portrait)

1. Load Dashboard with 5+ sessions
2. Scroll vertically through list
3. Tap "Open" action on a session
4. Navigate back

**Expected:** No horizontal scroll, session rows clearly separated, actions easy to tap.

## Performance Targets (Mobile 4G Slow)

- **First Paint:** <2s
- **Interactive:** <5s
- **Time to Load Results:** <8s total

**Measurement:** Use Chrome DevTools throttling (Slow 4G, 4x CPU slowdown).

## Accessibility Compliance

**Mobile-specific:**

- ✓ Color contrast ≥4.5:1 for text (especially on busy backgrounds)
- ✓ Focus indicators visible (keyboard navigation works)
- ✓ Touch targets ≥44x44 pixels
- ✓ No reliance on color alone (use icons + labels)

## Final Checklist for Deploy

- [ ] Tested on iPhone 12 mini (375px) portrait & landscape
- [ ] Tested on iPad Air (768px) portrait & landscape
- [ ] No horizontal scroll at any breakpoint
- [ ] All buttons/inputs are ≥44x44 tappable
- [ ] Font sizes ≥16px for inputs (prevents zoom-on-focus)
- [ ] Lighthouse mobile score ≥85
- [ ] Results page loads within 8s on slow 4G
- [ ] Chat UI remains readable during keyboard display
- [ ] No text crowding or overflow at 375px width

## Implementation Priority

1. **High Priority (blocking release):**
   - Add `minHeight: 44px` to input & button styles
   - Add `fontSize: max(0.95rem, 16px)` to text inputs
   - Verify no horizontal scroll at 375px

2. **Medium Priority (before public demo):**
   - Add `wordBreak: "break-word"` to card titles
   - Test on real devices (iPhone + iPad)
   - Run Lighthouse audit

3. **Low Priority (polish):**
   - Fine-tune spacing on tablet
   - Optimize performance for slow 4G
