/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.autocomplete

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.CompoundButton
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.ItemTouchHelper.SimpleCallback
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.Dispatchers.Main
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.browser.domains.CustomDomains
import org.mozilla.focus.GleanMetrics.Autocomplete
import org.mozilla.focus.R
import org.mozilla.focus.databinding.FragmentAutocompleteCustomdomainsBinding
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.ext.showToolbar
import org.mozilla.focus.settings.BaseSettingsLikeFragment
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.Screen
import org.mozilla.focus.utils.ViewUtils
import java.util.Collections
import kotlin.coroutines.CoroutineContext

typealias DomainFormatter = (String) -> String

/**
 * Fragment showing settings UI listing all custom autocomplete domains entered by the user.
 */
open class AutocompleteListFragment : BaseSettingsLikeFragment(), CoroutineScope {
    private var job = Job()
    override val coroutineContext: CoroutineContext
        get() = job + Main
    private var _binding: FragmentAutocompleteCustomdomainsBinding? = null
    protected val binding get() = _binding!!

    /**
     * ItemTouchHelper for reordering items in the domain list.
     */
    val itemTouchHelper: ItemTouchHelper = ItemTouchHelper(
        object : SimpleCallback(ItemTouchHelper.UP or ItemTouchHelper.DOWN, 0) {
            override fun onMove(
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder,
            ): Boolean {
                val from = viewHolder.bindingAdapterPosition
                val to = target.bindingAdapterPosition

                (recyclerView.adapter as DomainListAdapter).move(from, to)

                return true
            }

            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                // empty on purpose
            }

            override fun getMovementFlags(recyclerView: RecyclerView, viewHolder: RecyclerView.ViewHolder): Int {
                if (viewHolder is AddActionViewHolder) {
                    return makeMovementFlags(0, 0)
                }

                return super.getMovementFlags(recyclerView, viewHolder)
            }

            override fun onSelectedChanged(viewHolder: RecyclerView.ViewHolder?, actionState: Int) {
                super.onSelectedChanged(viewHolder, actionState)

                if (viewHolder is DomainViewHolder) {
                    viewHolder.onSelected()
                }
            }

            override fun clearView(recyclerView: RecyclerView, viewHolder: RecyclerView.ViewHolder) {
                super.clearView(recyclerView, viewHolder)

                if (viewHolder is DomainViewHolder) {
                    viewHolder.onCleared()
                }
            }

            override fun canDropOver(
                recyclerView: RecyclerView,
                current: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder,
            ): Boolean {
                if (target is AddActionViewHolder) {
                    return false
                }

                return super.canDropOver(recyclerView, current, target)
            }
        },
    )

    /**
     * In selection mode the user can select and remove items. In non-selection mode the list can
     * be reordered by the user.
     */
    open fun isSelectionMode() = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentAutocompleteCustomdomainsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.domainList.apply {
            layoutManager = LinearLayoutManager(activity, RecyclerView.VERTICAL, false)
            adapter = DomainListAdapter()
            setHasFixedSize(true)

            if (!isSelectionMode()) {
                itemTouchHelper.attachToRecyclerView(this)
            }
        }
    }

    override fun onResume() {
        super.onResume()

        if (job.isCancelled) {
            job = Job()
        }

        showToolbar(getString(R.string.preference_autocomplete_subitem_manage_sites))

        (binding.domainList.adapter as DomainListAdapter).refresh(requireActivity()) {
            activity?.invalidateOptionsMenu()
        }
    }

    override fun onPause() {
        job.cancel()
        super.onPause()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    override fun onCreateMenu(menu: Menu, menuInflater: MenuInflater) {
        menuInflater.inflate(R.menu.menu_autocomplete_list, menu)
    }

    override fun onPrepareMenu(menu: Menu) {
        val removeItem = menu.findItem(R.id.remove)

        removeItem?.let {
            it.isVisible = isSelectionMode() || binding.domainList.adapter!!.itemCount > 1
            val isEnabled =
                !isSelectionMode() || (binding.domainList.adapter as DomainListAdapter).selection()
                    .isNotEmpty()
            ViewUtils.setMenuItemEnabled(it, isEnabled)
        }
    }

    override fun onMenuItemSelected(menuItem: MenuItem): Boolean = when (menuItem.itemId) {
        R.id.remove -> {
            requireComponents.appStore.dispatch(
                AppAction.OpenSettings(page = Screen.Settings.Page.SearchAutocompleteRemove),
            )
            true
        }
        else -> false
    }

    /**
     * Adapter implementation for the list of custom autocomplete domains.
     */
    inner class DomainListAdapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        private val domains: MutableList<String> = mutableListOf()
        private val selectedDomains: MutableList<String> = mutableListOf()

        fun refresh(context: Context, body: (() -> Unit)? = null) {
            launch(Main) {
                val updatedDomains =
                    withContext(Dispatchers.Default) {
                        CustomDomains.load(context)
                    }

                domains.clear()
                domains.addAll(updatedDomains)

                notifyDataSetChanged()

                body?.invoke()
            }
        }

        override fun getItemViewType(position: Int) =
            when (position) {
                domains.size -> AddActionViewHolder.LAYOUT_ID
                else -> DomainViewHolder.LAYOUT_ID
            }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder =
            when (viewType) {
                AddActionViewHolder.LAYOUT_ID ->
                    AddActionViewHolder(
                        this@AutocompleteListFragment,
                        LayoutInflater.from(parent.context).inflate(viewType, parent, false),
                    )
                DomainViewHolder.LAYOUT_ID ->
                    DomainViewHolder(
                        LayoutInflater.from(parent.context).inflate(viewType, parent, false),
                    ) { AutocompleteDomainFormatter.format(it) }
                else -> throw IllegalArgumentException("Unknown view type: $viewType")
            }

        override fun getItemCount(): Int = domains.size + if (isSelectionMode()) 0 else 1

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            if (holder is DomainViewHolder) {
                holder.bind(
                    domains[position],
                    isSelectionMode(),
                    selectedDomains,
                    itemTouchHelper,
                    this@AutocompleteListFragment,
                )
            }
        }

        override fun onViewRecycled(holder: RecyclerView.ViewHolder) {
            if (holder is DomainViewHolder) {
                holder.checkBoxView.setOnCheckedChangeListener(null)
            }
        }

        fun selection(): List<String> = selectedDomains

        fun move(from: Int, to: Int) {
            Collections.swap(domains, from, to)
            notifyItemMoved(from, to)

            launch(IO) {
                CustomDomains.save(activity!!.applicationContext, domains)
                Autocomplete.listOrderChanged.add()
            }
        }
    }

    /**
     * ViewHolder implementation for a domain item in the list.
     */
    private class DomainViewHolder(
        itemView: View,
        val domainFormatter: DomainFormatter? = null,
    ) : RecyclerView.ViewHolder(itemView) {
        val domainView: TextView = itemView.findViewById(R.id.domainView)
        val checkBoxView: CheckBox = itemView.findViewById(R.id.checkbox)
        val handleView: View = itemView.findViewById(R.id.handleView)

        companion object {
            val LAYOUT_ID = R.layout.item_custom_domain
        }

        fun bind(
            domain: String,
            isSelectionMode: Boolean,
            selectedDomains: MutableList<String>,
            itemTouchHelper: ItemTouchHelper,
            fragment: AutocompleteListFragment,
        ) {
            domainView.text = domainFormatter?.invoke(domain) ?: domain

            checkBoxView.isVisible = isSelectionMode
            checkBoxView.isChecked = selectedDomains.contains(domain)
            checkBoxView.setOnCheckedChangeListener { _: CompoundButton, isChecked: Boolean ->
                if (isChecked) {
                    selectedDomains.add(domain)
                } else {
                    selectedDomains.remove(domain)
                }

                fragment.activity?.invalidateOptionsMenu()
            }

            handleView.isVisible = !isSelectionMode
            handleView.setOnTouchListener { _, event ->
                if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                    itemTouchHelper.startDrag(this)
                }
                false
            }

            if (isSelectionMode) {
                itemView.setOnClickListener {
                    checkBoxView.isChecked = !checkBoxView.isChecked
                }
            }
        }

        fun onSelected() {
            itemView.setBackgroundColor(ContextCompat.getColor(itemView.context, R.color.disabled))
        }

        fun onCleared() {
            itemView.setBackgroundColor(0)
        }
    }

    /**
     * ViewHolder implementation for a "Add custom domain" item at the bottom of the list.
     */
    private class AddActionViewHolder(
        val fragment: AutocompleteListFragment,
        itemView: View,
    ) : RecyclerView.ViewHolder(itemView) {
        init {
            itemView.setOnClickListener {
                fragment.requireComponents.appStore.dispatch(
                    AppAction.OpenSettings(page = Screen.Settings.Page.SearchAutocompleteAdd),
                )
            }
        }

        companion object {
            val LAYOUT_ID = R.layout.item_add_custom_domain
        }
    }
}
