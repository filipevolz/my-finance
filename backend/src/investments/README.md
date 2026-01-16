# Serviço de Assets - Substituição da API MyProfit

Este módulo implementa um serviço para substituir a API privada do MyProfit (`/API/Assets`) por uma solução própria que pode usar diferentes fontes de dados.

## Arquitetura

A solução foi projetada para ser facilmente extensível e permitir troca de provedores de dados:

```
Controller (investments.controller.ts)
    ↓
ExternalAssetsService (gerencia provedores)
    ↓
IAssetProvider (interface)
    ├── DatabaseAssetProvider (banco de dados local)
    ├── DadosMercadoProvider (API Dados de Mercado)
    └── B3Provider (API B3)
    ↓
AssetMapper (converte para formato MyProfit)
```

## Endpoints

### GET `/investments/assets`

Endpoint principal para buscar assets. Suporta dois formatos:

**Formato MyProfit (compatível):**
```
GET /investments/assets?assetSearch=PETR&group=STOCK&limit=50&offset=0
```

**Formato padrão:**
```
GET /investments/assets?search=PETR&assetGroup=STOCK&limit=50
```

**Parâmetros:**
- `assetSearch` ou `search`: Filtro por ticker ou nome do ativo
- `group` ou `assetGroup`: Grupo do ativo (STOCK, ETF, etc)
- `limit`: Número máximo de resultados (padrão: 50)
- `offset`: Offset para paginação (padrão: 0)

**Resposta (formato MyProfit):**
```json
[
  {
    "ID": 1,
    "AssetName": "PETROBRAS",
    "Ticker": "PETR4",
    "Alias": "PETR4",
    "TickerRef": "",
    "Pic": null,
    "Sector": "Petróleo",
    "SubSector": null,
    "TypeTax": null,
    "DueDate": null,
    "Index": null,
    "Tax": 0,
    "Segment": null,
    "AssetType": "PN",
    "CNPJ": null,
    "CNPJAdmin": null,
    "Administrator": null,
    "LegalName": "PETROBRAS",
    "CodeAPI": null,
    "Exceptions": null,
    "Market": 0,
    "MarketString": "Bovespa",
    "Category": null,
    "Exemption": false,
    "AssetGroup": "STOCK",
    "AssetSeries": null
  }
]
```

### GET `/investments/assets/myprofit`

Endpoint alternativo que sempre retorna formato MyProfit:
```
GET /investments/assets/myprofit?assetSearch=PETR&group=STOCK&limit=50&offset=0
```

## Configuração

### Variável de Ambiente

Configure qual provedor usar através da variável de ambiente `ASSET_PROVIDER`:

```bash
# Usar banco de dados local (padrão)
ASSET_PROVIDER=DATABASE

# Usar API Dados de Mercado
ASSET_PROVIDER=DADOS_MERCADO

# Usar API B3
ASSET_PROVIDER=B3
```

### Provedores Disponíveis

#### 1. DatabaseAssetProvider (Padrão)
- Usa o banco de dados PostgreSQL local
- Assets já populados do `assets.json`
- Mais rápido e não depende de APIs externas
- **Recomendado para produção**

#### 2. DadosMercadoProvider
- Consome API do Dados de Mercado
- Requer implementação completa da API real
- **Status:** Estrutura criada, precisa ajustar endpoints reais

#### 3. B3Provider
- Consome API da B3
- Requer implementação completa
- **Status:** Estrutura criada, precisa implementar

## Como Adicionar um Novo Provedor

1. Criar uma classe que implementa `IAssetProvider`:

```typescript
@Injectable()
export class MeuProvedorProvider implements IAssetProvider {
  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    // Implementar busca na API
    return [];
  }
}
```

2. Registrar no módulo (`investments.module.ts`):

```typescript
providers: [
  // ...
  MeuProvedorProvider,
],
```

3. Adicionar no `ExternalAssetsService`:

```typescript
constructor(
  // ...
  private readonly meuProvedor: MeuProvedorProvider,
) {
  // Adicionar case no switch
  case 'MEU_PROVEDOR':
    this.currentProvider = meuProvedor;
    break;
}
```

## Mapper

O `AssetMapper` converte dados de qualquer API para o formato MyProfit:

- **Extração automática de tipo**: Identifica ON, PN, PNA, PNB, UNT do ticker
- **Alias = Ticker**: Conforme requisito
- **Campos opcionais**: Campos não disponíveis são `null`
- **IDs únicos**: Baseados no offset para paginação consistente

## Exemplo de Uso

```typescript
// No controller
const assets = await this.externalAssetsService.searchAssets(
  'PETR',      // busca
  'STOCK',     // grupo
  50,          // limit
  0            // offset
);
```

## Sincronização de Assets

### Sincronizar Assets de APIs Externas

Para alimentar a tabela `assets` do banco de dados com dados de APIs públicas:

**1. Sincronização completa de um grupo:**
```bash
GET /investments/assets/sync-external?group=STOCK&limit=100
```

Este endpoint:
- Busca assets da API externa configurada (via `ASSET_PROVIDER`)
- Salva/atualiza no banco de dados
- Retorna número de assets sincronizados

**2. Sincronização por busca:**
```bash
GET /investments/assets/sync-search?search=PETR&group=STOCK
```

Busca e sincroniza apenas assets que correspondem ao termo de busca.

**3. Provedores disponíveis:**

- **DATABASE** (padrão): Usa banco local
- **BRAPI**: API brapi.dev (requer `BRAPI_TOKEN` opcional)
- **ALPHA_VANTAGE**: Alpha Vantage (requer `ALPHA_VANTAGE_API_KEY`)

**Exemplo de uso:**
```bash
# Configurar provedor
ASSET_PROVIDER=BRAPI

# Sincronizar ações
curl -X GET "http://localhost:3000/investments/assets/sync-external?group=STOCK&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Configuração de API Keys

No arquivo `.env`:

```bash
# brapi.dev (opcional, mas recomendado)
BRAPI_TOKEN=seu_token_aqui

# Alpha Vantage (requer cadastro gratuito)
ALPHA_VANTAGE_API_KEY=sua_chave_aqui
```

**Nota:** brapi.dev funciona sem token, mas com token você tem mais requisições por dia.

## Migração da API MyProfit

Para migrar código que usa a API MyProfit:

**Antes:**
```typescript
fetch('https://myprofitweb.com/API/Assets?assetSearch=PETR&group=STOCK')
```

**Depois:**
```typescript
fetch('http://localhost:3000/investments/assets?assetSearch=PETR&group=STOCK')
```

O formato de resposta é idêntico, então não é necessário alterar o código de parsing.

## Notas Importantes

1. **IDs não são persistentes**: Os IDs são gerados dinamicamente baseados no offset. Não devem ser usados como chave primária.

2. **Paginação**: Use `limit` e `offset` para paginação. IDs são calculados como `offset + index + 1`.

3. **Filtros**: O filtro `assetSearch` busca em ticker e nome do ativo (case-insensitive).

4. **Performance**: O `DatabaseAssetProvider` é mais rápido pois não faz chamadas HTTP externas.
