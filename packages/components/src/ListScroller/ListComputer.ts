export type SectionHeight = number | ((section: number) => number);
export type RowHeight = number | ((section: number, row: number) => number);
export type FooterHeight = number | ((section: number) => number) | null | undefined;
export type ListHeaderHeight = number | (() => number) | null | undefined;
export type GetAnchorId = (section: number, row?: number) => string | number | undefined;

export interface ListHeaderItem {
  type: 'header';
  section: -1;
  offsetTop: number;
  anchorId?: undefined;
}

export interface ListSectionItem {
  type: 'section';
  section: number;
  listIndex: number;
  offsetTop: number;
  anchorId: string | number | undefined;
}

export interface ListRowItem {
  type: 'row';
  section: number;
  listIndex: number;
  row: number;
  rowIndex: number;
  offsetTop: number;
  anchorId: string | number | undefined;
}

export interface ListFooterItem {
  type: 'footer';
  section: number;
  offsetTop: number;
  anchorId?: undefined;
}

export type ListItem = ListHeaderItem | ListSectionItem | ListRowItem | ListFooterItem;

export interface ListComputerProps {
  sectionHeight: SectionHeight;
  rowHeight: RowHeight;
  footerHeight: FooterHeight;
  listHeaderHeight: ListHeaderHeight;
  paddingTop: number;
  paddingBottom: number;
  sections: number[];
  getAnchorId?: GetAnchorId;
}

export const isListRowItem = (item: ListItem): item is ListRowItem => item.type === 'row';

/** Lays out a sectioned list and works out which items fall inside a scroll range. */
export class ListComputer {
  sectionHeight: SectionHeight = 0;
  rowHeight: RowHeight = 0;
  footerHeight: FooterHeight = 0;
  listHeaderHeight: ListHeaderHeight = 0;
  uniform = false;
  paddingBottom = 0;
  paddingTop = 0;
  sections: number[] = [];
  getAnchorId: GetAnchorId = () => undefined;

  mergeProps({
    sectionHeight,
    rowHeight,
    footerHeight,
    listHeaderHeight,
    paddingTop,
    paddingBottom,
    sections,
    getAnchorId,
  }: ListComputerProps) {
    this.sections = sections;
    this.sectionHeight = sectionHeight;
    this.rowHeight = rowHeight;
    this.footerHeight = footerHeight;
    this.listHeaderHeight = listHeaderHeight;
    this.uniform = typeof rowHeight === 'number';
    this.paddingTop = paddingTop;
    this.paddingBottom = paddingBottom;
    this.getAnchorId = getAnchorId ?? this.getAnchorId;
  }

  getHeight() {
    let height = this.paddingTop + this.getListHeaderHeight();
    const { length } = this.sections;
    for (let section = 0; section < length; section++) {
      height += this.getHeightForSection(section);
      if (this.uniform) height += this.sections[section] * this.getHeightForRow(section, 0);
      else for (let row = 0; row < this.sections[section]; row++) height += this.getHeightForRow(section, row);
      height += this.getHeightForFooter(section);
    }
    return height + this.paddingBottom;
  }

  getHeightForSection(section: number) {
    const { sectionHeight } = this;
    return typeof sectionHeight === 'number' ? sectionHeight : sectionHeight(section);
  }

  getHeightForRow(section: number, row: number) {
    const { rowHeight } = this;
    return typeof rowHeight === 'number' ? rowHeight : rowHeight(section, row);
  }

  getHeightForFooter(section: number) {
    const { footerHeight } = this;
    return footerHeight == null ? 0 : typeof footerHeight === 'number' ? footerHeight : footerHeight(section);
  }

  getListHeaderHeight() {
    const { listHeaderHeight } = this;
    return listHeaderHeight == null ? 0 : typeof listHeaderHeight === 'number' ? listHeaderHeight : listHeaderHeight();
  }

  compute(start: number, end: number) {
    let offset = this.paddingTop;
    let spacerTop = offset;
    let itemTop = offset;
    let rowIndex = 0;
    let listIndex = 0;
    const items: ListItem[] = [];
    // Advances past an item and reports whether it overlaps [start, end].
    const visit = (height: number) => {
      itemTop = offset;
      offset += height;
      if (offset < start) {
        spacerTop += height;
        return false;
      }
      return !(itemTop > end);
    };
    if (visit(this.getListHeaderHeight())) items.push({ type: 'header', section: -1, offsetTop: itemTop });
    for (let section = 0; section < this.sections.length; section++) {
      const rows = this.sections[section];
      if (rows === 0) continue;
      if (visit(this.getHeightForSection(section))) {
        items.push({ type: 'section', section, listIndex, offsetTop: itemTop, anchorId: this.getAnchorId(section) });
      }
      listIndex += 1;
      if (this.uniform) {
        const height = this.getHeightForRow(section, 0);
        for (let row = 0; row < rows; row++) {
          if (visit(height)) {
            items.push({
              type: 'row',
              section,
              listIndex,
              row,
              rowIndex,
              offsetTop: itemTop,
              anchorId: this.getAnchorId(section, row),
            });
          }
          rowIndex += 1;
          listIndex += 1;
        }
      } else {
        for (let row = 0; row < rows; row++) {
          if (visit(this.getHeightForRow(section, row))) {
            items.push({
              type: 'row',
              section,
              listIndex,
              row,
              rowIndex,
              offsetTop: itemTop,
              anchorId: this.getAnchorId(section, row),
            });
          }
          rowIndex += 1;
          listIndex += 1;
        }
      }
      if (visit(this.getHeightForFooter(section))) items.push({ type: 'footer', section, offsetTop: itemTop });
    }
    return { spacerTop, totalHeight: offset + this.paddingBottom, items };
  }

  computeScrollPosition(targetSection: number, targetRow?: number): [number, number] {
    let position = this.paddingTop + this.getListHeaderHeight();
    let section = 0;
    let found = false;
    while (section <= targetSection) {
      const rows = this.sections[section];
      if (section === targetSection && targetRow == null) {
        found = true;
        break;
      }
      if (rows === 0) {
        section += 1;
        continue;
      }
      position += this.getHeightForSection(section);
      if (this.uniform) {
        const height = this.getHeightForRow(section, 0);
        if (section === targetSection && targetRow != null) {
          position += height * targetRow;
          found = true;
        } else position += height * rows;
      } else {
        for (let row = 0; row < rows; row++) {
          if (section < targetSection || (section === targetSection && targetRow != null && row < targetRow)) {
            position += this.getHeightForRow(section, row);
          } else if (section === targetSection && targetRow != null && row === targetRow) {
            found = true;
            break;
          }
        }
      }
      if (!found) position += this.getHeightForFooter(section);
      section += 1;
    }
    return [
      position,
      targetRow != null ? this.getHeightForRow(targetSection, targetRow) : this.getHeightForSection(section),
    ];
  }
}
