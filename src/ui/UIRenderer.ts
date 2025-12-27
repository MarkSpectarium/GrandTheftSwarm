/**
 * UIRenderer - Core UI rendering system
 *
 * Provides reactive DOM updates based on game state.
 * Uses a simple virtual DOM-like diffing approach.
 */

import { SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { ResourceSystem } from "../systems/ResourceSystem";
import { BuildingSystem } from "../systems/BuildingSystem";
import { formatNumber, formatRate } from "../utils/NumberFormatter";
import { getResourceIcon, getBuildingIcon } from "../config/ui/icons.config";
import type { GameConfig } from "../config/types";

/** Callback for building purchase */
export type BuildingPurchaseHandler = (buildingId: string, count: number) => boolean;

export interface UIElements {
  root: HTMLElement;
  header: HTMLElement;
  resourcePanel: HTMLElement;
  harvestButton: HTMLElement;
  buildingPanel: HTMLElement;
  statsPanel: HTMLElement;
}

export class UIRenderer {
  private config: GameConfig;
  private stateManager: StateManager;
  private resourceSystem: ResourceSystem;
  private buildingSystem: BuildingSystem;
  private elements: UIElements | null = null;
  private lastRenderTime: number = 0;
  private renderThrottleMs: number = 50;

  // Cleanup tracking
  private subscriptions = new SubscriptionManager();
  private renderIntervalId: ReturnType<typeof setInterval> | null = null;
  private buildingPurchaseHandler: BuildingPurchaseHandler | null = null;

  constructor(
    config: GameConfig,
    stateManager: StateManager,
    resourceSystem: ResourceSystem,
    buildingSystem: BuildingSystem
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.resourceSystem = resourceSystem;
    this.buildingSystem = buildingSystem;
  }

  /**
   * Set handler for building purchases (used by event delegation)
   */
  setBuildingPurchaseHandler(handler: BuildingPurchaseHandler): void {
    this.buildingPurchaseHandler = handler;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
    if (this.renderIntervalId !== null) {
      clearInterval(this.renderIntervalId);
      this.renderIntervalId = null;
    }
    this.buildingPurchaseHandler = null;
    this.elements = null;
  }

  /**
   * Initialize the UI
   */
  initialize(rootElement: HTMLElement): void {
    this.elements = this.createLayout(rootElement);
    this.applyEraTheme(this.stateManager.getCurrentEra());
    this.setupEventListeners();
    this.render();
  }

  /**
   * Full render of the UI
   */
  render(): void {
    if (!this.elements) return;

    const now = performance.now();
    if (now - this.lastRenderTime < this.renderThrottleMs) {
      return;
    }
    this.lastRenderTime = now;

    this.renderHeader();
    this.renderResources();
    this.renderBuildings();
    this.renderStats();
  }

  /**
   * Handle harvest button click
   */
  onHarvestClick(): void {
    this.resourceSystem.processClick();
    this.animateHarvest();
  }

  private createLayout(root: HTMLElement): UIElements {
    root.innerHTML = "";
    root.className = "game-container";

    // Header
    const header = document.createElement("header");
    header.className = "game-header";
    header.innerHTML = `
      <h1 class="game-title">${this.config.meta.name}</h1>
      <div class="era-indicator"></div>
    `;

    // Main content
    const main = document.createElement("main");
    main.className = "game-main";

    // Resource panel
    const resourcePanel = document.createElement("section");
    resourcePanel.className = "panel resource-panel";
    resourcePanel.innerHTML = `
      <h2>Resources</h2>
      <div class="resource-list"></div>
    `;

    // Harvest area
    const harvestArea = document.createElement("section");
    harvestArea.className = "panel harvest-panel";
    const harvestButton = document.createElement("button");
    harvestButton.className = "harvest-button";
    harvestButton.innerHTML = `
      <span class="harvest-icon">🌾</span>
      <span class="harvest-text">Harvest Rice</span>
      <span class="harvest-amount"></span>
    `;
    harvestButton.addEventListener("click", () => this.onHarvestClick());
    harvestArea.appendChild(harvestButton);

    // Building panel
    const buildingPanel = document.createElement("section");
    buildingPanel.className = "panel building-panel";
    buildingPanel.innerHTML = `
      <h2>Buildings</h2>
      <div class="building-list"></div>
    `;

    // Stats panel
    const statsPanel = document.createElement("section");
    statsPanel.className = "panel stats-panel";
    statsPanel.innerHTML = `
      <h2>Statistics</h2>
      <div class="stats-list"></div>
    `;

    // Assemble
    main.appendChild(resourcePanel);
    main.appendChild(harvestArea);
    main.appendChild(buildingPanel);

    root.appendChild(header);
    root.appendChild(main);
    root.appendChild(statsPanel);

    return {
      root,
      header,
      resourcePanel,
      harvestButton,
      buildingPanel,
      statsPanel,
    };
  }

  private renderHeader(): void {
    if (!this.elements) return;

    const era = this.config.eras.find((e) => e.id === this.stateManager.getCurrentEra());
    const eraIndicator = this.elements.header.querySelector(".era-indicator");
    if (eraIndicator && era) {
      eraIndicator.textContent = `Era ${era.id}: ${era.name} (${era.timePeriod})`;
    }
  }

  private renderResources(): void {
    if (!this.elements) return;

    const list = this.elements.resourcePanel.querySelector(".resource-list");
    if (!list) return;

    const resources = this.resourceSystem.getUnlockedResources();

    // Check if we need to rebuild (new resources unlocked)
    const existingItems = list.querySelectorAll(".resource-item");
    const needsRebuild = existingItems.length !== resources.length;

    if (needsRebuild) {
      // Full rebuild only when resource count changes
      let html = "";

      for (const resource of resources) {
        const amount = this.resourceSystem.getAmount(resource.id);
        const rate = this.resourceSystem.getProductionRate(resource.id);

        html += `
          <div class="resource-item" data-resource="${resource.id}">
            <span class="resource-icon">${getResourceIcon(resource.id)}</span>
            <span class="resource-name">${resource.name}</span>
            <span class="resource-amount">${formatNumber(amount)}</span>
            <span class="resource-rate">${rate.perSecond > 0 ? formatRate(rate.perSecond) : ""}</span>
          </div>
        `;
      }

      list.innerHTML = html;
    } else {
      // Targeted update - only update values
      for (const resource of resources) {
        const item = list.querySelector(`[data-resource="${resource.id}"]`);
        if (!item) continue;

        const amount = this.resourceSystem.getAmount(resource.id);
        const rate = this.resourceSystem.getProductionRate(resource.id);

        const amountSpan = item.querySelector(".resource-amount");
        if (amountSpan) amountSpan.textContent = formatNumber(amount);

        const rateSpan = item.querySelector(".resource-rate");
        if (rateSpan) rateSpan.textContent = rate.perSecond > 0 ? formatRate(rate.perSecond) : "";
      }
    }
  }

  private renderBuildings(): void {
    if (!this.elements) return;

    const list = this.elements.buildingPanel.querySelector(".building-list");
    if (!list) return;

    const buildings = this.buildingSystem.getAvailableBuildings();
    const unlockedBuildings = buildings.filter((b) => b.unlocked);

    // Check if we need to rebuild the DOM (new buildings unlocked)
    const existingItems = list.querySelectorAll(".building-item");
    const needsRebuild = existingItems.length !== unlockedBuildings.length;

    if (needsRebuild) {
      // Full rebuild only when building count changes
      let html = "";

      for (const building of unlockedBuildings) {
        const costText = building.currentCost
          .map((c) => `${formatNumber(c.amount)} ${this.getResourceName(c.resourceId)}`)
          .join(", ");

        const productionText = Object.entries(building.productionPerSecond)
          .map(([id, rate]) => `${formatRate(rate)} ${this.getResourceName(id)}`)
          .join(", ");

        html += `
          <div class="building-item ${building.canAfford ? "" : "cannot-afford"}" data-building="${building.config.id}">
            <div class="building-header">
              <span class="building-icon">${getBuildingIcon(building.config.id)}</span>
              <span class="building-name">${building.config.name}</span>
              <span class="building-owned">x${building.owned}</span>
            </div>
            <div class="building-info">
              <span class="building-production">${productionText || "Passive production"}</span>
            </div>
            <div class="building-cost">Cost: ${costText}</div>
            <button
              class="building-buy-btn"
              ${building.canAfford ? "" : "disabled"}
              data-building-buy="${building.config.id}"
            >
              Buy
            </button>
          </div>
        `;
      }

      list.innerHTML = html || '<p class="no-buildings">No buildings available yet</p>';
    } else {
      // Targeted update - only update text content and attributes
      for (const building of unlockedBuildings) {
        const item = list.querySelector(`[data-building="${building.config.id}"]`);
        if (!item) continue;

        // Update owned count
        const ownedSpan = item.querySelector(".building-owned");
        if (ownedSpan) ownedSpan.textContent = `x${building.owned}`;

        // Update cost
        const costDiv = item.querySelector(".building-cost");
        if (costDiv) {
          const costText = building.currentCost
            .map((c) => `${formatNumber(c.amount)} ${this.getResourceName(c.resourceId)}`)
            .join(", ");
          costDiv.textContent = `Cost: ${costText}`;
        }

        // Update affordability
        const button = item.querySelector(".building-buy-btn") as HTMLButtonElement | null;
        if (button) {
          button.disabled = !building.canAfford;
        }
        item.classList.toggle("cannot-afford", !building.canAfford);
      }
    }
  }

  private renderStats(): void {
    if (!this.elements) return;

    const list = this.elements.statsPanel.querySelector(".stats-list");
    if (!list) return;

    const state = this.stateManager.getState();

    const playTime = Math.floor(state.statistics.totalPlayTimeMs / 1000);
    const hours = Math.floor(playTime / 3600);
    const minutes = Math.floor((playTime % 3600) / 60);
    const seconds = playTime % 60;

    list.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Clicks</span>
        <span class="stat-value">${formatNumber(state.statistics.totalClicks)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Rice Harvested (Click)</span>
        <span class="stat-value">${formatNumber(state.statistics.totalClickHarvested)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Buildings Purchased</span>
        <span class="stat-value">${formatNumber(state.statistics.totalBuildingsPurchased)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Play Time</span>
        <span class="stat-value">${hours}h ${minutes}m ${seconds}s</span>
      </div>
    `;
  }

  private animateHarvest(): void {
    if (!this.elements) return;

    this.elements.harvestButton.classList.add("harvesting");
    setTimeout(() => {
      this.elements?.harvestButton.classList.remove("harvesting");
    }, 100);

    // Floating number animation
    const amount = formatNumber(this.resourceSystem.getAmount("rice"));
    this.showFloatingText("+1", this.elements.harvestButton);
  }

  private showFloatingText(text: string, anchor: HTMLElement): void {
    const float = document.createElement("div");
    float.className = "floating-text";
    float.textContent = text;

    const rect = anchor.getBoundingClientRect();
    float.style.left = `${rect.left + rect.width / 2}px`;
    float.style.top = `${rect.top}px`;

    document.body.appendChild(float);

    setTimeout(() => float.remove(), 1000);
  }

  private applyEraTheme(eraId: number): void {
    const era = this.config.eras.find((e) => e.id === eraId);
    if (!era || !this.elements) return;

    const { theme } = era;
    const root = this.elements.root;

    root.style.setProperty("--primary-color", theme.primaryColor);
    root.style.setProperty("--secondary-color", theme.secondaryColor);
    root.style.setProperty("--accent-color", theme.accentColor);
    root.style.setProperty("--background-color", theme.background);
    root.style.setProperty("--text-color", theme.textColor);
    root.style.setProperty("--header-font", theme.headerFont);
    root.style.setProperty("--body-font", theme.bodyFont);

    // Apply era CSS class
    root.className = `game-container ${theme.cssClass}`;
  }

  private getResourceName(resourceId: string): string {
    const resource = this.config.resources.find((r) => r.id === resourceId);
    return resource?.name || resourceId;
  }

  private setupEventListeners(): void {
    // Re-render on relevant events (tracked for cleanup)
    this.subscriptions.subscribe("resource:changed", () => this.render());
    this.subscriptions.subscribe("building:purchased", () => this.render());
    this.subscriptions.subscribe("building:unlocked", () => this.render());
    this.subscriptions.subscribe("era:transition:complete", ({ eraId }) => {
      this.applyEraTheme(eraId);
      this.render();
    });

    // Periodic render for rates (tracked for cleanup)
    this.renderIntervalId = setInterval(() => this.render(), 1000);

    // Event delegation for building purchases (fixes XSS vulnerability)
    if (this.elements) {
      this.elements.buildingPanel.addEventListener("click", this.handleBuildingPanelClick);
    }
  }

  /**
   * Handle clicks on building panel using event delegation
   */
  private handleBuildingPanelClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const buyButton = target.closest("[data-building-buy]") as HTMLElement | null;

    if (buyButton && this.buildingPurchaseHandler) {
      const buildingId = buyButton.getAttribute("data-building-buy");
      if (buildingId) {
        this.buildingPurchaseHandler(buildingId, 1);
      }
    }
  };
}
