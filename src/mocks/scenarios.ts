export interface ScenarioConfig {
  latencyMs: number;
  emptyCatalog: boolean;
  failFavorites: boolean;
  sessionExpired: boolean;
  orderTimeout: boolean;
  paymentFailed: boolean;
  priceChangedInCart: boolean;
  editionSoldOut: boolean;
  invalidCredentialsError: boolean;
  simulateHttp500OnCatalog: boolean;
}

export const defaultScenarios: ScenarioConfig = {
  latencyMs: 50,
  emptyCatalog: false,
  failFavorites: false, // Dispara erro 500 para comprovar rollback de mutação otimista
  sessionExpired: false, // Dispara erro 401 para comprovar expiração de sessão
  orderTimeout: false, // Dispara erro 504 para comprovar idempotência no retry
  paymentFailed: false, // Marca status do pedido como REJECTED
  priceChangedInCart: false, // Dispara erro 409 com alteração de preço
  editionSoldOut: false, // Dispara erro 409 com edição esgotada
  invalidCredentialsError: false,
  simulateHttp500OnCatalog: false,
};

const SCENARIOS_STORAGE_KEY = 'jungle_nft_mock_scenarios';

class ScenarioManager {
  private config: ScenarioConfig = { ...defaultScenarios };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
        if (stored) {
          this.config = { ...defaultScenarios, ...JSON.parse(stored) };
        }
      } catch {
        this.config = { ...defaultScenarios };
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(this.config));
      } catch {
        // Ignora erros de quota de storage
      }
    }
  }

  public get(): ScenarioConfig {
    return { ...this.config };
  }

  public set(partial: Partial<ScenarioConfig>): ScenarioConfig {
    this.config = { ...this.config, ...partial };
    this.saveToStorage();
    return this.get();
  }

  public reset(): ScenarioConfig {
    this.config = { ...defaultScenarios };
    this.saveToStorage();
    return this.get();
  }
}

export const scenarios = new ScenarioManager();
