import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './category.entity';
import { AuthModule } from '../auth/auth.module';
import { categoriesSeed } from './categories.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private readonly categoriesService: CategoriesService) {}

  async onModuleInit() {
    // Verificar se já existem categorias
    const existingCategories = await this.categoriesService.findAll();
    if (existingCategories.length === 0) {
      // Popular categorias apenas se o banco estiver vazio
      await this.categoriesService.createMany(categoriesSeed);
    } else {
      // Se já existem categorias, atualizar os ícones para usar Lucide React
      await this.categoriesService.updateCategoryIcons();
    }
  }
}
