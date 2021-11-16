<script>
	// items is an array of items to group.
	export let items;

	// groupForItem is a function that takes an item,
	// and returns which group it should be in.
	export let groupForItem;

	let groupedItems = null;

	$: if (items) {
		groupedItems = groupAll(items);
	}

	function groupAll(items) {
		const groupedItems = [];
		let lastGroup = null;
		let group = null;
		items.forEach((item) => {
			const itemGroup = groupForItem(item);
			if (lastGroup == null || lastGroup != itemGroup) {
				lastGroup = itemGroup;
				group = {
					group: itemGroup,
					items: []
				};
				groupedItems.push(group);
			}
			group.items.push(item);
		});
		return groupedItems;
	}
</script>

{#each groupedItems as groupedItem}
	<slot name="group" group={groupedItem.group} />
	{#each groupedItem.items as item}
		<slot name="item" {item} />
	{/each}
{/each}
