/// Arka plan (node sidecar) sürecini tutar; uygulama kapanırken sonlandırılır.
#[allow(dead_code)]
struct SidecarState(std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Tek örnek koruması: uygulama zaten açıksa ikinci örnek açılmaz,
        // mevcut pencere öne getirilir ve focus alır.
        .plugin(
            tauri_plugin_single_instance::Builder::new()
                .callback(|app, _args, _cwd| {
                    use tauri::Manager;
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;
                use tauri_plugin_shell::ShellExt;

                let resource_dir = app
                    .path()
                    .resource_dir()
                    .expect("Failed to get resource dir");

                let mut server_js_path = resource_dir.join("backend").join("dist").join("server.js");
                if !server_js_path.exists() {
                    server_js_path = resource_dir.join("_up_").join("backend").join("dist").join("server.js");
                }

                let sidecar_command = app
                    .shell()
                    .sidecar("node")
                    .expect("Failed to create sidecar command")
                    .arg(server_js_path.to_str().unwrap());

                let (mut rx, child) = sidecar_command.spawn().expect("Failed to spawn sidecar");
                app.manage(SidecarState(std::sync::Mutex::new(Some(child))));

                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        println!("Backend: {:?}", event);
                    }
                });
            }

            // Debug modunda app kullanılmadığı için derleyici uyarısını bastır
            #[cfg(debug_assertions)]
            let _ = app;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                use tauri::Manager;
                if let Some(state) = app_handle.try_state::<SidecarState>() {
                    if let Some(child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}
