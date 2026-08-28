declare const idBrand: unique symbol;

type BrandedId<TName extends string> = string & {
  readonly [idBrand]?: TName;
};

export type DatasetId = BrandedId<'DatasetId'>;
export type SourceItemId = BrandedId<'SourceItemId'>;
export type SeriesId = BrandedId<'SeriesId'>;
export type GroupId = BrandedId<'GroupId'>;
export type ViewNodeId = SourceItemId | GroupId;
