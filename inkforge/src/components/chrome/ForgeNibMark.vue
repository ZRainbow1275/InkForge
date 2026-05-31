<script setup lang="ts">
/**
 * InkForge brand mark — 墨滴 · 笔锋 · 铁砧 mark, 0 font dependency.
 *
 * A vertically stacked mark narrating 墨铸 / InkForge top→bottom:
 *   红珠 ember (灵感)   — a Forged-Red circle, the spark of inspiration
 *   墨滴 ink-drop (墨)   — a black teardrop sliced by a paper-colored diagonal
 *   笔锋箭头 nib-arrow   — a bold stroke that slices the drop and shoots ↗
 *                          (创作 / 发送 / 发布 — the writing-and-publish gesture)
 *   铁砧 anvil (铸)      — a black forging-anvil base (Forge made literal)
 *
 * It reads as ink being forged on an anvil. Five progressive tiers mirror
 * inkforge/src-tauri/icons/master-{16,32,64,256,1024}.svg.
 *
 * Three design pillars (brand identity doc §9):
 *  - 墨滴 / 书写 — the ink-drop is the writing substance
 *  - 锻造 / 铁砧 — the anvil roots the mark in 铸 (forging) heritage
 *  - 发送 / 发布 — the nib-arrow is the creative + publish gesture
 *
 * This replaces the prior 鼎 × 笔尖 × 方格 grid mark (which read muddy at small
 * sizes). The user supplied an approved concept sheet ("Logo Concept 08") and
 * selected this 墨滴 · 笔锋 · 铁砧 mark as the official logo.
 *
 * Palette (NEW official logo tokens):
 *  - 墨黑 Ink Black  #1C1F23 — drop, anvil, arrow
 *  - 铸红 Forged Red #C9362C — ember + accents
 *  - 灰  Grey        #6B6F76 — secondary detail
 *  - 浅灰 Light Grey #E6E8EB — subtle
 *  - 砚白 Paper      #F7F4EF — background, slice gap, negative space
 *
 * Tier policy (matches brand identity doc §9.3):
 *  - 16   → solid teardrop (no slice), small ember dot, bold anvil; no arrow
 *  - 32   → drop + thin slice + short stub arrow + ember dot + clearer anvil
 *  - 64   → full drop + slice + full arrowhead + ember + anvil overhang +
 *           1px-equivalent drop highlight
 *  - 256  → full detail + soft top-left highlight on drop + contact shadow
 *  - 1024 → hero: full mark + sheen gradient on drop + ember glow + warm
 *           contact shadow
 *
 * Latin / 简体 wordmark composition is the host's responsibility. This mark
 * is iconography-only; the host (TitleBar / Hub welcome / Settings About /
 * index.html boot / splash.html) wraps it in HTML and supplies the
 * "InkForge · 墨铸" + tagline next to it using the app font stack.
 *
 * Motion (§9.6 of brand identity doc):
 *  - Idle: static
 *  - Hover (interactive prop): the mark warms via filter: brightness/saturate,
 *    motion-base 180ms ease-out-quart. The Forged-Red ember warms up. No scale.
 *  - Annealing (autosave): when the active editor transitions out of the
 *    'saving' state, root gains data-state="annealing" for 600ms which pulses
 *    the ember (100% → 120% → 100% brightness) — the 铸/cast warmth flare.
 *
 * Reference: docs/inkforge-brand-identity.md §9.
 */
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor'

type ForgeNibTier = 16 | 32 | 64 | 256 | 1024

interface ForgeNibMarkProps {
    /** Rendered CSS size in px (or any CSS length string). */
    size?: number | string
    /** Detail tier — picks which master SVG layers to inline. Defaults to 32. */
    tier?: ForgeNibTier
    /** Hide from a11y tree when used purely decoratively next to a text label. */
    decorative?: boolean
    /**
     * Enable hover micro-interaction (ember warming, §9.6).
     * Without this prop the mark is purely static.
     */
    interactive?: boolean
    /**
     * Subscribe to the active editor 'saving' → 'ready' transition. When
     * the transition fires, the mark briefly enters the annealing pulse.
     * Defaults to true; pass `false` for marks rendered before the Pinia
     * store is available (e.g. tests, isolated previews).
     */
    reactive?: boolean
}

const props = withDefaults(defineProps<ForgeNibMarkProps>(), {
    size: 32,
    tier: 32,
    decorative: true,
    interactive: false,
    reactive: true,
})

const annealing = ref(false)
let annealingTimer: ReturnType<typeof setTimeout> | null = null
let stopWatch: (() => void) | null = null

function triggerAnneal(): void {
    if (annealingTimer !== null) {
        clearTimeout(annealingTimer)
    }
    annealing.value = true
    annealingTimer = setTimeout(() => {
        annealing.value = false
        annealingTimer = null
    }, 600)
}

if (props.reactive) {
    try {
        const editorStore = useEditorStore()
        stopWatch = watch(
            () => editorStore.status,
            (next, prev) => {
                if (prev === 'saving' && next !== 'saving') {
                    triggerAnneal()
                }
            },
        )
    } catch {
        // No active Pinia (test / preview); mark stays idle.
    }
}

onBeforeUnmount(() => {
    if (annealingTimer !== null) {
        clearTimeout(annealingTimer)
        annealingTimer = null
    }
    stopWatch?.()
    stopWatch = null
})
</script>

<template>
  <!-- All tiers share viewBox 0 0 1024 1024. CSS width/height drives display.
       Inline switch by tier so each tier ships only the layers needed (no
       runtime SVG fetch). Geometry is identical to the master-*.svg files
       in src-tauri/icons/. -->
  <svg
    :width="typeof size === 'number' ? size : undefined"
    :height="typeof size === 'number' ? size : undefined"
    :style="typeof size === 'string' ? `width:${size};height:${size}` : undefined"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : 'InkForge 墨铸'"
    class="forge-nib-mark"
    :class="[`forge-nib-mark--tier-${tier}`, { 'forge-nib-mark--interactive': interactive }]"
    :data-state="annealing ? 'annealing' : undefined"
  >
    <!-- ============================================================ -->
    <!-- TIER 16 — solid teardrop, ember dot, bold anvil (no slice)   -->
    <!-- ============================================================ -->
    <template v-if="tier === 16">
      <circle
        cx="512"
        cy="196"
        r="64"
        fill="#C9362C"
        class="forge-nib-mark__ember"
      />
      <path
        d="M 512 296 C 560 374 632 448 632 526 C 632 592 578 640 512 640 C 446 640 392 592 392 526 C 392 448 464 374 512 296 Z"
        fill="#1C1F23"
      />
      <path
        d="M 288 690 Q 282 689 287 704 L 308 746 Q 320 768 360 770 L 470 770 L 470 788 Q 444 794 438 820 Q 432 842 420 852 L 372 868 Q 350 876 350 886 L 674 886 Q 674 876 652 868 L 604 852 Q 592 842 586 820 Q 580 794 554 788 L 554 770 L 664 770 Q 704 768 716 746 L 737 704 Q 742 689 736 690 Q 704 720 632 720 L 392 720 Q 320 720 288 690 Z"
        fill="#1C1F23"
      />
    </template>

    <!-- ============================================================ -->
    <!-- TIER 32 — drop + thin slice + stub arrow + ember + anvil     -->
    <!-- ============================================================ -->
    <template v-else-if="tier === 32">
      <defs>
        <mask :id="`dropSlice-tier32`">
          <rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            fill="#FFFFFF"
          />
          <path
            d="M 356 612 L 668 430 L 700 484 L 388 666 Z"
            fill="#000000"
          />
        </mask>
      </defs>
      <circle
        cx="512"
        cy="184"
        r="58"
        fill="#C9362C"
        class="forge-nib-mark__ember"
      />
      <path
        d="M 512 290 C 556 362 622 430 622 504 C 622 566 572 612 512 612 C 452 612 402 566 402 504 C 402 430 468 362 512 290 Z"
        fill="#1C1F23"
        :mask="`url(#dropSlice-tier32)`"
      />
      <path
        d="M 392 648 L 684 466 L 660 514 L 408 672 Z"
        fill="#1C1F23"
      />
      <path
        d="M 748 366 L 596 426 L 666 470 L 694 540 Z"
        fill="#1C1F23"
      />
      <path
        d="M 300 676 Q 294 675 298 688 L 318 728 Q 328 748 364 750 L 472 750 L 472 770 Q 448 776 442 802 Q 436 826 424 838 L 378 856 Q 358 864 358 874 L 666 874 Q 666 864 646 856 L 600 838 Q 588 826 582 802 Q 576 776 552 770 L 552 750 L 660 750 Q 696 748 706 728 L 726 688 Q 730 675 724 676 Q 696 704 632 704 L 392 704 Q 328 704 300 676 Z"
        fill="#1C1F23"
      />
    </template>

    <!-- ============================================================ -->
    <!-- TIER 64 — full drop + slice + full arrowhead + anvil + 1px hl -->
    <!-- ============================================================ -->
    <template v-else-if="tier === 64">
      <defs>
        <mask :id="`dropSlice-tier64`">
          <rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            fill="#FFFFFF"
          />
          <path
            d="M 348 620 L 694 415 L 736 487 L 390 692 Z"
            fill="#000000"
          />
        </mask>
      </defs>
      <circle
        cx="512"
        cy="180"
        r="56"
        fill="#C9362C"
        class="forge-nib-mark__ember"
      />
      <path
        d="M 512 286 C 556 360 624 430 624 506 C 624 568 574 614 512 614 C 450 614 400 568 400 506 C 400 430 468 360 512 286 Z"
        fill="#1C1F23"
        :mask="`url(#dropSlice-tier64)`"
      />
      <path
        d="M 502 308 C 478 352 452 396 448 446 C 470 408 492 360 506 326 Z"
        fill="#3A3E45"
        opacity="0.55"
        :mask="`url(#dropSlice-tier64)`"
      />
      <path
        d="M 374 660 L 704 458 L 676 510 L 390 690 Z"
        fill="#1C1F23"
      />
      <path
        d="M 790 288 L 612 360 L 668 392 L 702 376 L 690 438 L 726 488 L 790 288 Z"
        fill="#1C1F23"
      />
      <path
        d="M 292 670 Q 286 669 290 682 L 310 724 Q 320 746 358 748 L 474 748 L 474 768 Q 446 774 440 802 Q 434 828 421 840 L 372 858 Q 350 866 350 876 L 674 876 Q 674 866 652 858 L 603 840 Q 590 828 584 802 Q 578 774 550 768 L 550 748 L 666 748 Q 704 746 714 724 L 734 682 Q 738 669 732 670 Q 702 700 634 700 L 390 700 Q 322 700 292 670 Z"
        fill="#1C1F23"
      />
    </template>

    <!-- ============================================================ -->
    <!-- TIER 256 — full detail + drop highlight + contact shadow     -->
    <!-- ============================================================ -->
    <template v-else-if="tier === 256">
      <defs>
        <radialGradient
          :id="`anvilShadow-tier256`"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0%" stop-color="#1C1F23" stop-opacity="0.18" />
          <stop offset="70%" stop-color="#1C1F23" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#1C1F23" stop-opacity="0" />
        </radialGradient>
        <mask :id="`dropSlice-tier256`">
          <rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            fill="#FFFFFF"
          />
          <path
            d="M 352 612 L 690 415 L 726 477 L 388 674 Z"
            fill="#000000"
          />
        </mask>
      </defs>
      <ellipse
        cx="512"
        cy="872"
        rx="200"
        ry="26"
        :fill="`url(#anvilShadow-tier256)`"
      />
      <circle
        cx="512"
        cy="178"
        r="54"
        fill="#C9362C"
        class="forge-nib-mark__ember"
      />
      <circle
        cx="494"
        cy="160"
        r="18"
        fill="#E66054"
        opacity="0.5"
        class="forge-nib-mark__ember-hl"
      />
      <path
        d="M 512 286 C 556 360 624 430 624 506 C 624 568 574 614 512 614 C 450 614 400 568 400 506 C 400 430 468 360 512 286 Z"
        fill="#1C1F23"
        :mask="`url(#dropSlice-tier256)`"
      />
      <path
        d="M 512 300 C 484 348 452 396 446 452 C 470 410 496 360 512 320 Z"
        fill="#2B2F35"
        opacity="0.6"
        :mask="`url(#dropSlice-tier256)`"
      />
      <path
        d="M 380 654 L 700 459 L 676 503 L 396 678 Z"
        fill="#1C1F23"
      />
      <path
        d="M 786 292 L 618 360 L 668 388 L 700 374 L 690 432 L 720 480 L 786 292 Z"
        fill="#1C1F23"
      />
      <path
        d="M 296 672 Q 290 671 294 682 L 312 722 Q 322 742 358 744 L 472 744 L 472 766 Q 446 772 440 800 Q 434 826 422 838 L 374 856 Q 352 864 352 874 L 672 874 Q 672 864 650 856 L 602 838 Q 590 826 584 800 Q 578 772 552 766 L 552 744 L 666 744 Q 702 742 712 722 L 730 682 Q 734 671 728 672 Q 700 700 636 700 L 388 700 Q 324 700 296 672 Z"
        fill="#1C1F23"
      />
    </template>

    <!-- ============================================================ -->
    <!-- TIER 1024 — hero: full mark + sheen + ember glow + shadow    -->
    <!-- ============================================================ -->
    <template v-else>
      <defs>
        <linearGradient
          :id="`dropSheen-tier1024`"
          x1="0"
          y1="0"
          x2="0.55"
          y2="1"
        >
          <stop offset="0%" stop-color="#2B2F35" />
          <stop offset="48%" stop-color="#1C1F23" />
          <stop offset="100%" stop-color="#141619" />
        </linearGradient>
        <radialGradient
          :id="`emberGlow-tier1024`"
          cx="42%"
          cy="38%"
          r="62%"
        >
          <stop offset="0%" stop-color="#E66054" stop-opacity="0.55" />
          <stop offset="55%" stop-color="#C9362C" stop-opacity="0" />
          <stop offset="100%" stop-color="#C9362C" stop-opacity="0" />
        </radialGradient>
        <radialGradient
          :id="`anvilShadow-tier1024`"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0%" stop-color="#1C1F23" stop-opacity="0.22" />
          <stop offset="70%" stop-color="#1C1F23" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#1C1F23" stop-opacity="0" />
        </radialGradient>
        <mask :id="`dropSlice-tier1024`">
          <rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            fill="#FFFFFF"
          />
          <path
            d="M 352 612 L 690 415 L 726 477 L 388 674 Z"
            fill="#000000"
          />
        </mask>
      </defs>
      <ellipse
        cx="512"
        cy="872"
        rx="210"
        ry="30"
        :fill="`url(#anvilShadow-tier1024)`"
      />
      <circle
        cx="512"
        cy="178"
        r="54"
        fill="#C9362C"
        class="forge-nib-mark__ember"
      />
      <circle
        cx="512"
        cy="178"
        r="54"
        :fill="`url(#emberGlow-tier1024)`"
        class="forge-nib-mark__ember-glow"
      />
      <path
        d="M 512 286 C 556 360 624 430 624 506 C 624 568 574 614 512 614 C 450 614 400 568 400 506 C 400 430 468 360 512 286 Z"
        :fill="`url(#dropSheen-tier1024)`"
        :mask="`url(#dropSlice-tier1024)`"
      />
      <path
        d="M 380 654 L 700 459 L 676 503 L 396 678 Z"
        fill="#1C1F23"
      />
      <path
        d="M 786 292 L 618 360 L 668 388 L 700 374 L 690 432 L 720 480 L 786 292 Z"
        fill="#1C1F23"
      />
      <path
        d="M 296 672 Q 290 671 294 682 L 312 722 Q 322 742 358 744 L 472 744 L 472 766 Q 446 772 440 800 Q 434 826 422 838 L 374 856 Q 352 864 352 874 L 672 874 Q 672 864 650 856 L 602 838 Q 590 826 584 800 Q 578 772 552 766 L 552 744 L 666 744 Q 702 742 712 722 L 730 682 Q 734 671 728 672 Q 700 700 636 700 L 388 700 Q 324 700 296 672 Z"
        fill="#1C1F23"
      />
    </template>
  </svg>
</template>

<style scoped>
.forge-nib-mark {
    display: block;
    transition: filter var(--motion-base, 180ms) var(--ease-out-quart, ease-out);
}

/* Hover warmth (§9.6). The mark stays static; it lifts via brightness toward
   the Forged-Red ember warmth without disturbing geometry — no scale, no
   exterior drop-shadow. Hosts that wrap the mark in `pointer-events: none`
   (drag regions) will see no hover reaction — by design, per TitleBar
   drag-region contract §12.10. */
.forge-nib-mark--interactive:hover {
    filter: brightness(1.08) saturate(1.1);
}

/* Annealing pulse (§9.6). When the editor's saving → ready transition fires,
   the host element is decorated with data-state="annealing" for 600ms. The
   warmth flare is concentrated on the Forged-Red ember — it pulses to 120%
   brightness then settles, narrating the 「铸」 (cast) moment. Curve is
   symmetric ease-out-quart so the flare feels like a single warmth pulse, not
   a flash. Tier 16/32 marks (which still carry an .ember) participate too. */
.forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember,
.forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember-glow,
.forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember-hl {
    animation: forge-nib-anneal 600ms var(--ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1)) both;
    transform-box: fill-box;
    transform-origin: center;
}

@keyframes forge-nib-anneal {
    0% {
        filter: brightness(1);
    }
    50% {
        filter: brightness(1.25) saturate(1.2);
    }
    100% {
        filter: brightness(1);
    }
}

/* Reduced motion: tokens.css already cascades --motion-* to 0ms, so the
   hover transition becomes instant. The annealing animation does not
   reference a token (its duration is the semantic 600ms warmth window,
   not part of the Restrained Premium ladder), so kill it explicitly. */
@media (prefers-reduced-motion: reduce) {
    .forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember,
    .forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember-glow,
    .forge-nib-mark[data-state='annealing'] .forge-nib-mark__ember-hl {
        animation: none;
    }
}
</style>
