'use client'

import { useParams } from 'next/navigation'
import { useCollection } from '@/hooks/use-collections'
import { useAssets } from '@/hooks/use-assets'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
	ArrowLeft,
	Package,
	Layers,
	AlertCircle,
	CheckCircle,
	Building2,
	Tag,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function CollectionDetailPage() {
	const params = useParams()
	const collectionId = params?.id as string

	function getConditionColor(condition: string) {
		switch (condition) {
			case 'GREEN':
				return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
			case 'ORANGE':
				return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
			case 'RED':
				return 'bg-red-500/10 text-red-600 border-red-500/20'
			default:
				return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
		}
	}

	// Fetch data
	const { data: collectionData, isLoading } = useCollection(collectionId)

	const collection = collectionData?.data

	// Fetch assets for adding to collection
	const companyId = collection?.company_id

	const { data: assetsData } = useAssets({
		company_id: typeof companyId === 'string' ? companyId : undefined,
		limit: '200',
	})

	if (isLoading) {
		return (
			<div className='min-h-screen bg-background p-8'>
				<div className='animate-pulse space-y-8'>
					<div className='h-8 bg-muted rounded w-1/3' />
					<div className='h-64 bg-muted rounded' />
					<div className='space-y-4'>
						{[...Array(3)].map((_, i) => (
							<div key={i} className='h-32 bg-muted rounded' />
						))}
					</div>
				</div>
			</div>
		)
	}

	if (!collection) {
		return (
			<div className='min-h-screen bg-background p-8 flex items-center justify-center'>
				<Card className='p-12 text-center max-w-md'>
					<AlertCircle className='w-16 h-16 mx-auto mb-4 text-destructive' />
					<h3 className='text-lg font-semibold mb-2'>
						Collection Not Found
					</h3>
					<p className='text-muted-foreground text-sm mb-6'>
						This collection may have been deleted or you don't have
						access to it.
					</p>
					<Button asChild>
						<Link href='/collections'>
							Back to Collections
						</Link>
					</Button>
				</Card>
			</div>
		)
	}

	const totalVolume = collection?.assets?.reduce(
		(sum, item) =>
			sum + parseFloat(item?.asset?.volume_per_unit || '0') * item?.default_quantity,
		0
	)
	const totalWeight = collection?.assets?.reduce(
		(sum, item) =>
			sum + parseFloat(item?.asset?.weight_per_unit || '0') * item?.default_quantity,
		0
	)

	return (
		<div className='min-h-screen bg-background p-8'>
			{/* Header */}
			<div className='mb-8'>
				<Link
					href='/collections'
					className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors'
				>
					<ArrowLeft className='w-4 h-4' />
					Back to Collections
				</Link>

				<div className='flex items-start justify-between gap-6'>
					<div className='flex-1'>
						<div className='flex items-center gap-3 mb-2'>
							<div className='p-2 bg-primary/10 rounded-lg'>
								<Layers className='w-6 h-6 text-primary' />
							</div>
							<h1 className='text-4xl font-bold tracking-tight text-foreground'>
								{collection.name}
							</h1>
						</div>

						{collection.description && (
							<p className='text-muted-foreground mt-3 max-w-3xl'>
								{collection.description}
							</p>
						)}

						<div className='flex flex-wrap gap-2 mt-4'>
							{collection.company?.name && (
								<Badge variant='outline' className='gap-1.5'>
									<Building2 className='w-3 h-3' />
									{collection.company?.name}
								</Badge>
							)}
							{collection.brand?.name && (
								<Badge variant='outline' className='gap-1.5'>
									<Tag className='w-3 h-3' />
									{collection.brand?.name}
								</Badge>
							)}
							{collection.category && (
								<Badge variant='outline'>
									{collection.category}
								</Badge>
							)}
							<Badge variant='secondary'>
								{collectionData?.data?.assets?.length}{' '}
								{collectionData?.data?.assets?.length === 1 ? 'item' : 'items'}
							</Badge>
						</div>
					</div>
				</div>
			</div>

			{/* Collection Images */}
			{collection.images.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4'>Images</h2>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						{collection.images.map((image, index) => (
							<div
								key={index}
								className='aspect-square rounded-lg overflow-hidden border border-border relative group'
							>
								<Image
									src={image}
									alt={`${collection.name} ${index + 1}`}
									fill
									className='object-cover group-hover:scale-110 transition-transform duration-500'
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Summary Stats */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Items
						</div>
						<div className='text-3xl font-bold'>
							{collection?.assets?.length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Volume
						</div>
						<div className='text-3xl font-bold'>
							{totalVolume.toFixed(3)} m³
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Weight
						</div>
						<div className='text-3xl font-bold'>
							{totalWeight.toFixed(2)} kg
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Collection Items */}
			<div className='mb-8'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-xl font-semibold'>Collection Items</h2>
				</div>

				{collection?.assets?.length === 0 ? (
					<Card className='p-12 text-center'>
						<Package className='w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50' />
						<h3 className='text-lg font-semibold mb-2'>
							No items yet
						</h3>
						<p className='text-muted-foreground text-sm mb-6'>
							Add assets to this collection to create a complete
							bundle.
						</p>
					</Card>
				) : (
					<div className='space-y-4'>
						{collection?.assets?.map(item => (
							<Card
								key={item.id}
								className='overflow-hidden hover:shadow-md transition-shadow'
							>
								<CardContent className='p-6'>
									<div className='flex gap-6'>
										{/* Asset Image */}
										<div className='w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0'>
											{item?.asset?.images?.length >
												0 ? (
												<Image
													src={
														item?.asset?.images?.[0]
													}
													alt={item?.asset?.name}
													width={96}
													height={96}
													className='object-cover w-full h-full'
												/>
											) : (
												<div className='w-full h-full bg-muted flex items-center justify-center'>
													<Package className='w-8 h-8 text-muted-foreground/30' />
												</div>
											)}
										</div>

										{/* Asset Details */}
										<div className='flex-1'>
											<div className='flex items-start justify-between mb-2'>
												<div>
													<h3 className='text-lg font-semibold mb-1'>
														{item?.asset.name}
													</h3>
													<div className='flex items-center gap-2 text-sm text-muted-foreground'>
														<span>
															{item?.asset.category}
														</span>
														<span>•</span>
														<span>
															Qty:{' '}
															{
																item.default_quantity
															}
														</span>
														<span>•</span>
														<span>
															{(
																parseFloat(
																	item?.asset?.volume_per_unit
																) *
																item.default_quantity
															).toFixed(2)}{' '}
															m³
														</span>
														<span>•</span>
														<span>
															{(
																parseFloat(
																	item?.asset?.weight_per_unit
																) *
																item.default_quantity
															).toFixed(2)}{' '}
															kg
														</span>
													</div>
												</div>
											</div>

											<div className='flex items-center gap-3 mt-3'>
												<Badge
													variant='outline'
													className={getConditionColor(
														item?.asset?.condition
													)}
												>
													{item?.asset?.condition}
												</Badge>
												<Badge variant='outline'>
													{item?.asset?.available_quantity >=
														item.default_quantity ? (
														<>
															<CheckCircle className='w-3 h-3 mr-1' />
															Available
														</>
													) : (
														<>
															<AlertCircle className='w-3 h-3 mr-1' />
															Low Stock
														</>
													)}
												</Badge>
												<span className='text-sm text-muted-foreground'>
													{
														item?.asset?.available_quantity
													}{' '}
													/{' '}
													{
														item?.asset?.total_quantity
													}{' '}
													available
												</span>
											</div>

											{item?.asset?.notes && (
												<p className='text-sm text-muted-foreground mt-2 italic'>
													Note: {item?.asset?.notes}
												</p>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	)
}