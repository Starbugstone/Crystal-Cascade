import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useNativeDialog(close) {
  const dialog = ref(null),
    closeButton = ref(null);
  const previousFocus = document.activeElement;
  onMounted(() => {
    dialog.value.showModal();
    closeButton.value.focus({ preventScroll: true });
  });
  onBeforeUnmount(() => {
    dialog.value?.close();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  function dismissBackdrop(event) {
    if (event.target !== dialog.value) return;
    const box = dialog.value.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      close();
  }
  return { dialog, closeButton, dismissBackdrop };
}
