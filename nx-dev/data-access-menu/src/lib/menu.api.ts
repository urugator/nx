import { DocumentMetadata } from '@nrwl/nx-dev/models-document';
import { Menu, MenuItem, MenuSection } from '@nrwl/nx-dev/models-menu';
import { createMenuItems, getPackageApiSection } from './menu.utils';

export class MenuApi {
  private menuCache: Menu | null = null;

  constructor(
    private readonly documents: DocumentMetadata,
    private readonly packageDocuments: DocumentMetadata[] = [],
    private readonly extractorFunctions: ((x: MenuItem[]) => MenuSection)[] = []
  ) {}

  getMenu(): Menu {
    let menu = this.menuCache;

    if (menu) return menu;

    const items = createMenuItems(this.documents);
    if (!items) throw new Error(`Cannot find any documents`);

    const isAncestor: boolean = Boolean(
      items.length === 1 && items[0].itemList && items[0].itemList.length > 1
    );
    menu = {
      sections: this.extractorFunctions.map((categorizer) =>
        categorizer(isAncestor ? (items[0].itemList as MenuItem[]) : items)
      ),
    };

    if (!!this.packageDocuments.length)
      menu.sections.push(
        this.getReferenceApiMenuSection(this.packageDocuments)
      );

    this.menuCache = menu;

    return menu;
  }

  getReferenceApiMenuSection(
    packageDocuments: DocumentMetadata[] = this.packageDocuments
  ): MenuSection {
    const documents: DocumentMetadata = {
      id: 'packages',
      name: 'Packages',
      itemList: packageDocuments,
      path: '',
      packageName: '',
      isExternal: false,
      description: '',
      file: '',
      tags: [],
    };

    const items = createMenuItems(documents);
    return getPackageApiSection(items);
  }
}
