/**
 * LouvainCommunity.ts
 * Implementación ligera del algoritmo de Louvain para detección de comunidades.
 * Optimizado para grafos pequeños/medianos (< 1000 nodos).
 * 
 * Funciona en JavaScript puro, ideal para React Native sin dependencias nativas.
 */

export interface Edge {
  source: number;
  target: number;
  weight: number;
}

export function louvainCommunities(
  nodes: number[],
  edges: Edge[],
  resolution: number = 1.0
): Map<number, number> {
  if (nodes.length === 0) return new Map();

  // 1. Estructuras de datos
  const adj = new Map<number, Map<number, number>>();
  let totalWeight = 0;

  for (const n of nodes) {
    adj.set(n, new Map());
  }

  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    
    // Grafo no dirigido
    const w1 = adj.get(e.source)!.get(e.target) || 0;
    adj.get(e.source)!.set(e.target, w1 + e.weight);
    
    if (e.source !== e.target) {
      const w2 = adj.get(e.target)!.get(e.source) || 0;
      adj.get(e.target)!.set(e.source, w2 + e.weight);
    }
    
    totalWeight += e.weight;
  }

  // M2 es la suma de todos los pesos en el grafo no dirigido (*2 porque es simétrico)
  const m2 = totalWeight > 0 ? totalWeight * 2 : 1;

  // Estado de las comunidades
  const nodeCommunity = new Map<number, number>();
  const totWeight = new Map<number, number>(); // suma de pesos de enlaces incidentes a los nodos de la comunidad
  const inWeight = new Map<number, number>();  // suma de pesos internos de la comunidad
  const kWeight = new Map<number, number>();   // suma de pesos incidentes a cada nodo

  // Inicializar cada nodo en su propia comunidad
  for (const n of nodes) {
    nodeCommunity.set(n, n);
    let ki = 0;
    let selfLoop = 0;
    for (const [neighbor, weight] of adj.get(n)!.entries()) {
      ki += weight;
      if (neighbor === n) selfLoop += weight;
    }
    kWeight.set(n, ki);
    totWeight.set(n, ki);
    inWeight.set(n, selfLoop);
  }

  // 2. Primera Fase (Optimización de Modularidad local)
  let improvement = true;
  let maxIterations = 15; // Límite de seguridad
  let iter = 0;

  while (improvement && iter < maxIterations) {
    improvement = false;
    iter++;

    for (const i of nodes) {
      const currentComm = nodeCommunity.get(i)!;
      const ki = kWeight.get(i)!;
      
      // Encontrar comunidades vecinas
      const neighborComms = new Map<number, number>(); // communityId -> peso compartido con i
      let selfLoop = 0;
      
      for (const [neighbor, weight] of adj.get(i)!.entries()) {
        if (neighbor === i) {
          selfLoop += weight;
          continue;
        }
        const comm = nodeCommunity.get(neighbor)!;
        neighborComms.set(comm, (neighborComms.get(comm) || 0) + weight);
      }

      // Eliminar 'i' de su comunidad actual para evaluar alternativas
      totWeight.set(currentComm, totWeight.get(currentComm)! - ki);
      inWeight.set(currentComm, inWeight.get(currentComm)! - 2 * (neighborComms.get(currentComm) || 0) - selfLoop);

      let bestComm = currentComm;
      let bestIncrease = 0;

      // Evaluar insertar 'i' en cada comunidad vecina
      for (const [comm, sharedWeight] of neighborComms.entries()) {
        // Delta Q fórmula simplificada
        const totC = totWeight.get(comm) || 0;
        const increase = sharedWeight - resolution * (totC * ki) / m2;

        if (increase > bestIncrease) {
          bestIncrease = increase;
          bestComm = comm;
        }
      }

      // Evaluar la comunidad vacía (volver a la original)
      const emptyIncrease = 0 - resolution * (0 * ki) / m2;
      if (emptyIncrease > bestIncrease) {
        bestIncrease = emptyIncrease;
        bestComm = currentComm;
      }

      // Reinsertar 'i' en la comunidad elegida
      if (bestComm !== currentComm) {
        improvement = true;
      }

      nodeCommunity.set(i, bestComm);
      totWeight.set(bestComm, (totWeight.get(bestComm) || 0) + ki);
      inWeight.set(bestComm, (inWeight.get(bestComm) || 0) + 2 * (neighborComms.get(bestComm) || 0) + selfLoop);
    }
  }

  // Renombrar comunidades a índices continuos 0, 1, 2...
  const renameMap = new Map<number, number>();
  let nextId = 0;
  const result = new Map<number, number>();

  for (const [node, comm] of nodeCommunity.entries()) {
    if (!renameMap.has(comm)) {
      renameMap.set(comm, nextId++);
    }
    result.set(node, renameMap.get(comm)!);
  }

  return result;
}
