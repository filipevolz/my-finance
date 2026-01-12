import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from './category.entity';
import { categoriesSeed } from './categories.seed';

// Ordem específica das categorias de Income
const INCOME_ORDER = [
  'Salário',
  'Freelance',
  'Comissão',
  'Vendas',
  'Cashback',
  'Rendimentos',
  'Aluguel recebido',
  'Reembolso',
  'Presentes',
  'Outros',
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async findAll(type?: CategoryType): Promise<Category[]> {
    if (type) {
      const categories = await this.categoriesRepository.find({
        where: { type },
      });

      // Se for INCOME, ordena pela ordem específica do seed
      if (type === CategoryType.INCOME) {
        return categories.sort((a, b) => {
          const indexA = INCOME_ORDER.indexOf(a.name);
          const indexB = INCOME_ORDER.indexOf(b.name);
          // Se não encontrado na ordem, coloca no final
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }

      // Para outras categorias, ordena alfabeticamente
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    }
    return await this.categoriesRepository
      .createQueryBuilder('category')
      .orderBy('category.type', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Category> {
    return await this.categoriesRepository.findOneOrFail({
      where: { id },
    });
  }

  async create(category: Partial<Category>): Promise<Category> {
    const newCategory = this.categoriesRepository.create(category);
    return await this.categoriesRepository.save(newCategory);
  }

  async createMany(categories: Partial<Category>[]): Promise<Category[]> {
    const newCategories = this.categoriesRepository.create(categories);
    return await this.categoriesRepository.save(newCategories);
  }

  /**
   * Atualiza os ícones de todas as categorias existentes no banco de dados
   * para usar nomes de componentes do Lucide React ao invés de emojis
   */
  async updateCategoryIcons(): Promise<void> {
    const categories = await this.categoriesRepository.find();

    let updatedCount = 0;
    let skippedCount = 0;

    for (const category of categories) {
      // Buscar o ícone correto no seed baseado no nome e tipo
      const seedCategory = categoriesSeed.find(
        (c) => c.name === category.name && c.type === category.type,
      );

      if (seedCategory && seedCategory.icon) {
        // Atualizar apenas se o ícone for diferente
        if (category.icon !== seedCategory.icon) {
          category.icon = seedCategory.icon;
          await this.categoriesRepository.save(category);
          updatedCount++;
          console.log(
            `✅ Atualizado ícone da categoria "${category.name}" (${category.type}): ${category.icon} → ${seedCategory.icon}`,
          );
        } else {
          skippedCount++;
        }
      } else {
        console.warn(
          `⚠️  Categoria "${category.name}" (${category.type}) não encontrada no seed`,
        );
      }
    }

    console.log(
      `✅ Atualização de ícones concluída! ${updatedCount} atualizadas, ${skippedCount} já estavam atualizadas.`,
    );
  }
}
