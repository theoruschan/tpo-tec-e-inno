import { MarketPriceData } from '../../domain/entities/types';
import data from './marketPrices.json';

/**
 * Índices de precio de alquiler publicados (Zonaprop Index). Los actualiza
 * scripts/update_market_prices.py (GitHub Action mensual) a partir de los PDF.
 */
export const MARKET_PRICES: MarketPriceData = data;
