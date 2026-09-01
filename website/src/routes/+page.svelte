<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<!-- Never rendered in practice: the load above always redirects. It exists
     so the route is a page route, and so a visitor who somehow lands here
     with the redirect not applied still has somewhere to go. -->
<div class="container">
	<h1>Pzzlr</h1>
	<p>
		<a href={resolve('/explore')}>Explore games</a>, or
		<a href={resolve('/create')}>make one of your own</a>.
	</p>
</div>
